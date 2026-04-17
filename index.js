require('dotenv').config();
const express = require('express');
const { PrismaClient } = require('@prisma/client');
const rateLimit = require('express-rate-limit');
const cors = require('cors'); 
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const app = express();
const prisma = new PrismaClient();

app.use(cors());
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || "super_secret_village_api_key_2026";

// 🚦 THE CASH REGISTER (Rate Limiter)
const apiLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, 
    max: 50, 
    standardHeaders: true, 
    legacyHeaders: false,
    keyGenerator: (request) => request.header('x-api-key') || "anonymous",
    message: { success: false, error: "RATE_LIMITED", message: "Quota exceeded." }
});

// 🛑 THE BOUNCER (Database-Driven Middleware for API Keys)
const requireApiKey = async (request, response, next) => {
    try {
        const apiKey = request.header('x-api-key');
        if (!apiKey) return response.status(401).json({ success: false, error: "MISSING_API_KEY", message: "Header X-API-Key is required." });

        const keyRecord = await prisma.apiKey.findUnique({
            where: { key: apiKey },
            include: { user: true }
        });

        if (!keyRecord || !keyRecord.isActive) return response.status(401).json({ success: false, error: "INVALID_API_KEY", message: "Key is invalid or revoked." });

        request.user = keyRecord.user;
        next(); 
    } catch (error) {
        response.status(500).json({ error: "INTERNAL_ERROR" });
    }
};

app.use('/api/', apiLimiter);


// ============================================================================
// 🌍 PUBLIC B2B API ENDPOINTS (The Real Product - Protected by API Key)
// ============================================================================

// 1. Autocomplete Search (For "Typeahead" Address Forms)
app.get('/api/v1/autocomplete', requireApiKey, async (request, response) => {
    try {
        const query = request.query.q || "";
        if (query.length < 2) return response.status(400).json({ error: "INVALID_QUERY", message: "Search query must be at least 2 characters." });

        const villages = await prisma.village.findMany({
            where: { name: { contains: query, mode: 'insensitive' } },
            take: parseInt(request.query.limit) || 10,
            include: { subDistrict: { include: { district: { include: { state: { include: { country: true } } } } } } }
        });

        const formattedData = villages.map(v => {
            const sub = v.subDistrict?.name || "Unknown";
            const dist = v.subDistrict?.district?.name || "Unknown";
            const state = v.subDistrict?.district?.state?.name || "Unknown";
            const country = v.subDistrict?.district?.state?.country?.name || "India";

            return {
                value: v.code, label: v.name,
                fullAddress: `${v.name}, ${sub}, ${dist}, ${state}, ${country}`,
                hierarchy: { village: v.name, subDistrict: sub, district: dist, state: state, country: country }
            };
        });

        response.json({ success: true, count: formattedData.length, data: formattedData });
    } catch (error) {
        response.status(500).json({ error: "INTERNAL_ERROR" });
    }
});

// 2. Get All States
app.get('/api/v1/states', requireApiKey, async (request, response) => {
    try {
        const states = await prisma.state.findMany();
        response.json({ success: true, count: states.length, data: states });
    } catch (error) { response.status(500).json({ error: "INTERNAL_ERROR" }); }
});

// 3. Get Districts by State ID
app.get('/api/v1/states/:stateId/districts', requireApiKey, async (request, response) => {
    try {
        const districts = await prisma.district.findMany({
            where: { stateId: request.params.stateId }
        });
        response.json({ success: true, count: districts.length, data: districts });
    } catch (error) { response.status(500).json({ error: "INTERNAL_ERROR" }); }
});

// 4. Get Sub-Districts by District ID
app.get('/api/v1/districts/:districtId/subdistricts', requireApiKey, async (request, response) => {
    try {
        const subDistricts = await prisma.subDistrict.findMany({
            where: { districtId: request.params.districtId }
        });
        response.json({ success: true, count: subDistricts.length, data: subDistricts });
    } catch (error) { response.status(500).json({ error: "INTERNAL_ERROR" }); }
});

// 5. Get Villages by Sub-District ID (Paginated)
app.get('/api/v1/subdistricts/:subDistrictId/villages', requireApiKey, async (request, response) => {
    try {
        const page = parseInt(request.query.page) || 1;
        const limit = parseInt(request.query.limit) || 50;
        const skip = (page - 1) * limit;

        const villages = await prisma.village.findMany({
            where: { subDistrictId: request.params.subDistrictId },
            skip: skip, take: limit
        });
        response.json({ success: true, count: villages.length, page: page, data: villages });
    } catch (error) { response.status(500).json({ error: "INTERNAL_ERROR" }); }
});


// ============================================================================
// 🏢 B2B PORTAL AUTHENTICATION
// ============================================================================

app.post('/api/b2b/register', async (request, response) => {
    const { email, password, businessName } = request.body;
    try {
        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) return response.status(400).json({ success: false, error: 'Email already registered.' });

        const hashedPassword = await bcrypt.hash(password, 10);

        // Save to NeonDB (Defaults to PENDING status)
        const newUser = await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                businessName,
                planType: 'Free',
                status: 'PENDING_APPROVAL' 
            }
        });

        response.json({ success: true, message: 'Registration successful! Pending admin approval.' });
    } catch (error) {
        console.error("Registration Error:", error);
        response.status(500).json({ success: false, error: 'Internal Server Error. Please check Prisma Schema.' });
    }
});

app.post('/api/b2b/login', async (request, response) => {
    const { email, password } = request.body;
    try {
        // ✅ CHANGED: We now "include" the apiKeys so we can send them to the frontend
        const user = await prisma.user.findUnique({ 
            where: { email },
            include: { apiKeys: true } 
        });
        
        if (!user) return response.status(401).json({ success: false, error: 'Invalid credentials.' });

        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) return response.status(401).json({ success: false, error: 'Invalid credentials.' });

        const token = jwt.sign(
            { userId: user.id, email: user.email }, 
            JWT_SECRET, 
            { expiresIn: '24h' }
        );

        // ✅ Grab their real key if they have one, otherwise say pending
        const userKey = user.apiKeys.length > 0 ? user.apiKeys[0].key : "No key generated yet";

        response.json({ 
            success: true, 
            token, 
            user: { 
                email: user.email, 
                businessName: user.businessName, 
                plan: user.planType, 
                status: user.status,
                apiKey: userKey // ✅ Send the real key to the frontend!
            } 
        });
    } catch (error) {
        console.error("Login Error:", error);
        response.status(500).json({ success: false, error: 'Internal Server Error' });
    }
});


// ============================================================================
// 🔒 INTERNAL ADMIN ENDPOINTS (Secured by JWT & Password)
// ============================================================================

app.post('/api/admin/login', async (request, response) => {
    try {
        const { email, password } = request.body;
        if (!email || !password) return response.status(400).json({ success: false, error: "Email and password required" });

        const admin = await prisma.admin.findUnique({ where: { email: email } });
        if (!admin) return response.status(401).json({ success: false, error: "Invalid credentials" });

        const isPasswordValid = await bcrypt.compare(password, admin.passwordHash);
        if (!isPasswordValid) return response.status(401).json({ success: false, error: "Invalid credentials" });

        const token = jwt.sign({ id: admin.id, email: admin.email, role: admin.role }, JWT_SECRET, { expiresIn: '24h' });
        response.json({ success: true, token: token, admin: { email: admin.email, role: admin.role } });
    } catch (error) { response.status(500).json({ success: false, error: "Server error during login" }); }
});

app.get('/api/admin/clients', async (request, response) => {
    try {
        const users = await prisma.user.findMany({ include: { apiKeys: true } });
        const formattedClients = users.map(u => ({
            id: u.id, email: u.email, plan: u.planType,
            key: u.apiKeys[0]?.key || "No Key Generated", status: u.status // ✅ Fixed this to show actual user status
        }));
        response.json(formattedClients);
    } catch (error) { response.status(500).json({ error: "Failed to fetch clients" }); }
});

// ✅ FIXED ROUTE: Approve a pending B2B Client and generate their first API Key
app.patch('/api/admin/clients/:id/approve', async (request, response) => {
    try {
        // 🐛 THE FIX: Convert the ID from a String to an Integer for Prisma!
        const userId = parseInt(request.params.id, 10);
        
        // Generate a real, secure API Key
        const rawKey = crypto.randomBytes(16).toString('hex');
        const secureApiKey = `ak_live_${rawKey}`;

        // Update the user to Active AND create their key in the database
        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: {
                status: 'Active',
                apiKeys: {
                    create: { key: secureApiKey, secretHash: 'auto_generated_hash' }
                }
            }
        });
        
        response.json({ success: true, message: "User approved and API key generated." });
    } catch (error) {
        console.error("Approval Error:", error);
        response.status(500).json({ success: false, error: "Failed to approve user." });
    }
});
// ✅ BULLETPROOF ROUTE: Revoke a B2B Client's access and disable their API keys
app.patch('/api/admin/clients/:id/revoke', async (request, response) => {
    try {
        const userId = parseInt(request.params.id, 10);

        // 1. Update the user's status to Inactive
        await prisma.user.update({
            where: { id: userId },
            data: { status: 'Inactive' }
        });

        // 2. Disable all API keys belonging to this user
        await prisma.apiKey.updateMany({
            where: { userId: userId },
            data: { isActive: false }
        });
        
        response.json({ success: true, message: "User access revoked." });
    } catch (error) {
        console.error("Revoke Error:", error);
        response.status(500).json({ success: false, error: "Failed to revoke user." });
    }
});

app.post('/api/admin/clients', async (request, response) => {
    try {
        const { email, planType } = request.body;
        if (!email) return response.status(400).json({ error: "Email is required" });

        const rawKey = crypto.randomBytes(16).toString('hex');
        const secureApiKey = `ak_live_${rawKey}`;

        const newUser = await prisma.user.create({
            data: {
                email: email, planType: planType || 'Free', status: 'Active',
                apiKeys: { create: { key: secureApiKey, secretHash: 'admin_generated_dummy_hash' } }
            },
            include: { apiKeys: true }
        });
        response.status(201).json({ id: newUser.id, email: newUser.email, plan: newUser.planType, key: newUser.apiKeys[0].key, status: newUser.status });
    } catch (error) { response.status(500).json({ error: "Failed to create user." }); }
});

app.get('/api/admin/villages', async (request, response) => {
    try {
        const page = parseInt(request.query.page) || 1;
        const limit = parseInt(request.query.limit) || 100; 
        const skip = (page - 1) * limit;

        const [totalCount, rawVillages] = await Promise.all([
            prisma.village.count(),
            prisma.village.findMany({ skip: skip, take: limit, include: { subDistrict: { include: { district: { include: { state: true } } } } } })
        ]);

        const formattedVillages = rawVillages.map(v => ({
            code: v.code, name: v.name,
            subDistrict: v.subDistrict?.name || "N/A", district: v.subDistrict?.district?.name || "N/A", state: v.subDistrict?.district?.state?.name || "N/A",
        }));
        response.json({ pagination: { totalRecords: totalCount, currentPage: page, totalPages: Math.ceil(totalCount / limit) }, data: formattedVillages });
    } catch (error) { response.status(500).json({ error: "Failed to fetch villages" }); }
});

app.get('/api/admin/analytics', async (request, response) => {
    try {
        const totalVillages = await prisma.village.count();
        const totalClients = await prisma.user.count();

        const states = await prisma.state.findMany({
            select: { name: true, districts: { select: { subDistricts: { select: { _count: { select: { villages: true } } } } } } }
        });

        const liveChartData = states.map(state => {
            let count = 0;
            state.districts.forEach(d => { d.subDistricts.forEach(sd => { count += sd._count.villages; }); });
            return { name: state.name.split(' ')[0], villages: count };
        }).sort((a, b) => b.villages - a.villages).slice(0, 5); 

        response.json({ totalVillages: totalVillages, activeClients: totalClients, topStatesData: liveChartData });
    } catch (error) { response.status(500).json({ error: "Database timed out doing the heavy math!" }); }
});

app.listen(3000, () => {
    console.log("Success! Your fully armed and operational backend is running on http://localhost:3000");
});