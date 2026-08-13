const sql = require('../db');

const migrate = async () => {
    console.log("🚀 Starting Supabase Schema Migration...");
    try {
        // Enable UUID extension
        await sql`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`;

        // Users Table
        await sql`
            CREATE TABLE IF NOT EXISTS users (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                unique_id BIGINT UNIQUE,
                name TEXT DEFAULT '',
                username TEXT UNIQUE,
                email TEXT,
                password TEXT,
                image TEXT DEFAULT '',
                role TEXT DEFAULT 'user',
                gender TEXT DEFAULT '',
                age INTEGER DEFAULT 0,
                country TEXT,
                ip TEXT,
                identity TEXT,
                fcm_token TEXT,
                last_login TIMESTAMP WITH TIME ZONE,
                is_online BOOLEAN DEFAULT false,
                is_busy BOOLEAN DEFAULT false,
                is_fake BOOLEAN DEFAULT false,
                is_block BOOLEAN DEFAULT false,
                referral_code TEXT UNIQUE,
                referral_count INTEGER DEFAULT 0,
                diamond BIGINT DEFAULT 0,
                r_coin BIGINT DEFAULT 0,
                spent_coin BIGINT DEFAULT 0,
                is_vip BOOLEAN DEFAULT false,
                profile_setup_completed BOOLEAN DEFAULT false,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
            )
        `;
        console.log("✅ Users table ensured.");

        // Wallet Table
        await sql`
            CREATE TABLE IF NOT EXISTS wallet (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                user_id UUID REFERENCES users(id),
                other_user_id UUID REFERENCES users(id),
                type INTEGER,
                diamond BIGINT DEFAULT 0,
                r_coin BIGINT DEFAULT 0,
                is_income BOOLEAN DEFAULT true,
                payment_gateway TEXT,
                date TIMESTAMP WITH TIME ZONE DEFAULT now(),
                reason TEXT,
                admin_id TEXT
            )
        `;
        console.log("✅ Wallet table ensured.");

        // Agencies Table
        await sql`
            CREATE TABLE IF NOT EXISTS agencies (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                name TEXT NOT NULL,
                image TEXT DEFAULT '',
                bio TEXT DEFAULT '',
                owner_id UUID REFERENCES users(id) NOT NULL,
                bd_id UUID REFERENCES users(id),
                whatsapp_number TEXT,
                country TEXT,
                code TEXT UNIQUE,
                host_count INTEGER DEFAULT 0,
                active_host_count INTEGER DEFAULT 0,
                total_work BIGINT DEFAULT 0,
                status BOOLEAN DEFAULT true,
                is_deleted BOOLEAN DEFAULT false,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
            )
        `;
        console.log("✅ Agencies table ensured.");

        // BD Invitations
        await sql`
            CREATE TABLE IF NOT EXISTS bd_invitations (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                leader_id UUID REFERENCES users(id) NOT NULL,
                target_user_id UUID REFERENCES users(id) NOT NULL,
                status TEXT DEFAULT 'PENDING',
                message TEXT DEFAULT 'Invite to become a Business Developer',
                expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
                accepted_at TIMESTAMP WITH TIME ZONE,
                declined_at TIMESTAMP WITH TIME ZONE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
            )
        `;
        console.log("✅ BD Invitations table ensured.");

        // Agency Invitations
        await sql`
            CREATE TABLE IF NOT EXISTS agency_invitations (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                bd_id UUID REFERENCES users(id) NOT NULL,
                target_user_id UUID REFERENCES users(id) NOT NULL,
                status TEXT DEFAULT 'PENDING',
                message TEXT DEFAULT 'Invite to become an Agency',
                expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
                accepted_at TIMESTAMP WITH TIME ZONE,
                declined_at TIMESTAMP WITH TIME ZONE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
            )
        `;
        console.log("✅ Agency Invitations table ensured.");

        // General Invitations
        await sql`
            CREATE TABLE IF NOT EXISTS invitations (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                token TEXT UNIQUE NOT NULL,
                role TEXT NOT NULL,
                user_id UUID REFERENCES users(id),
                name TEXT,
                contact TEXT,
                bd_leader_id UUID,
                bd_id UUID,
                agency_id UUID REFERENCES agencies(id),
                sender_id TEXT,
                sender_role TEXT,
                message TEXT DEFAULT '',
                commission DOUBLE PRECISION DEFAULT 0,
                region TEXT,
                status TEXT DEFAULT 'PENDING',
                expiry_date TIMESTAMP WITH TIME ZONE NOT NULL,
                accepted_at TIMESTAMP WITH TIME ZONE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
            )
        `;
        console.log("✅ General Invitations table ensured.");

        console.log("🎉 Full migration completed successfully!");
        process.exit(0);
    } catch (error) {
        console.error("❌ Migration failed:", error.message);
        process.exit(1);
    }
};

migrate();
