require('dotenv').config();
const fs = require('fs');
const csv = require('csv-parser');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function seedDatabase() {
    console.log("Reading hierarchical CSV file...");
    const records = [];

    // 1. Read all CSV data into memory
    await new Promise((resolve, reject) => {
        fs.createReadStream('clean_india_villages.csv')
            .pipe(csv())
            .on('data', (data) => records.push(data))
            .on('end', resolve)
            .on('error', reject);
    });

    console.log(`Successfully read ${records.length} rows.`);
    
    // 🔪 SLICING FOR SAFETY: We are taking the first 500 to prove the hierarchy works.
    // Once this succeeds, you can change this to records.slice(0, 5000) or more!
    const chunk = records.slice(0, 500);
    console.log(`Processing batch of ${chunk.length} to build the relational tree...`);

    try {
        // 2. Create the Root Node (India)
        const country = await prisma.country.upsert({
            where: { code: 'IND' },
            update: {},
            create: { code: 'IND', name: 'India' }
        });

        // 3. Setup In-Memory Caches (Massive Performance Boost)
        const stateCache = {};
        const districtCache = {};
        const subDistrictCache = {};
        
        const villagesToInsert = [];

        // 4. Build the Geographical Tree
        for (let i = 0; i < chunk.length; i++) {
            const row = chunk[i];
            
            // Accommodate different potential header names from Pandas
            const stateName = row['state'] || row['STATE NAME'] || row['STATE'];
            const distName = row['district'] || row['DISTRICT NAME'] || "Unknown District";
            const subDistName = row['subDistrict'] || row['SUB-DISTRICT NAME'] || "Unknown SubDistrict";
            const villName = row['village'] || row['Area Name'] || row['VILLAGE NAME'];

            if (!stateName || !villName) continue; // Skip bad data

            // --- A. Handle State ---
            if (!stateCache[stateName]) {
                const stateCode = `ST_${stateName.replace(/\s+/g, '_').toUpperCase()}`;
                const state = await prisma.state.upsert({
                    where: { code: stateCode },
                    update: {},
                    create: { code: stateCode, name: stateName, countryId: country.id }
                });
                stateCache[stateName] = state.id; // Cache the ID!
            }
            const stateId = stateCache[stateName];

            // --- B. Handle District ---
            const distKey = `${stateName}_${distName}`;
            if (!districtCache[distKey]) {
                const distCode = `DT_${distName.replace(/\s+/g, '_').toUpperCase()}_${stateId}`;
                const district = await prisma.district.upsert({
                    where: { code: distCode },
                    update: {},
                    create: { code: distCode, name: distName, stateId: stateId }
                });
                districtCache[distKey] = district.id;
            }
            const districtId = districtCache[distKey];

            // --- C. Handle Sub-District ---
            const subDistKey = `${distKey}_${subDistName}`;
            if (!subDistrictCache[subDistKey]) {
                const subDistCode = `SD_${subDistName.replace(/\s+/g, '_').toUpperCase()}_${districtId}`;
                const subDistrict = await prisma.subDistrict.upsert({
                    where: { code: subDistCode },
                    update: {},
                    create: { code: subDistCode, name: subDistName, districtId: districtId }
                });
                subDistrictCache[subDistKey] = subDistrict.id;
            }
            const subDistrictId = subDistrictCache[subDistKey];

            // --- D. Prepare Village for Batch Insert ---
            const villCode = `VL_${villName.replace(/\s+/g, '_').toUpperCase()}_${i}`;
            villagesToInsert.push({
                code: villCode,
                name: villName,
                subDistrictId: subDistrictId
            });
        }

        // 5. Bulk Insert all Villages at once (Lighting Fast)
        console.log("Tree built. Batch inserting villages...");
        const result = await prisma.village.createMany({
            data: villagesToInsert,
            skipDuplicates: true
        });

        console.log(`✅ SUCCESS! Inserted ${result.count} relational villages into NeonDB.`);
        console.log("🏆 PHASE 1 IS OFFICIALLY COMPLETE.");

    } catch (error) {
        console.error("❌ Error during database seed:", error);
    } finally {
        await prisma.$disconnect();
    }
}

seedDatabase();