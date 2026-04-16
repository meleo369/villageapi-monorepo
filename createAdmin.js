const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function createSuperAdmin() {
    try {
        const adminEmail = "admin@bluestock.in";
        const plainTextPassword = "SuperSecretPassword123!"; 

        const hashedPassword = await bcrypt.hash(plainTextPassword, 10);

        const newAdmin = await prisma.admin.create({
            data: {
                email: adminEmail,
                passwordHash: hashedPassword,
                role: "SUPER_ADMIN"
            }
        });

        console.log(`✅ Success! Admin created: ${newAdmin.email}`);
        console.log(`🔒 Hashed Password saved in DB: ${newAdmin.passwordHash}`);
    } catch (error) {
        console.error("❌ Error creating admin:", error);
    } finally {
        await prisma.$disconnect();
    }
}

createSuperAdmin();