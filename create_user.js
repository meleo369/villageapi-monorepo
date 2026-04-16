const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function makeUser() {
    const newUser = await prisma.user.create({
        data: {
            email: "admin@bluestock.in",
            planType: "Unlimited",
            apiKeys: {
                create: {
                    key: "ak_live_7890abcdef12345678",
                    secretHash: "hashed_secret_placeholder"
                }
            }
        },
        include: {
            apiKeys: true
        }
    });

    console.log("✅ New User and API Key Created!");
    console.log(newUser);
}

makeUser();