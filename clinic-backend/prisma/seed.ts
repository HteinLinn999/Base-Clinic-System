import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import locationsData from './data/myanmar-locations.json';

interface TownshipInput {
  nameMm: string;
  nameEn: string;
  district: string;
}

interface StateInput {
  nameMm: string;
  nameEn: string;
  type: string; // Schema ထဲမှာ String ဆို stringပဲပြန်သုံးပေးရတယ်
  townships: TownshipInput[];
}

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main(): Promise<void> {
  console.log('🌱 Starting Myanmar Locations Seeding...');

  const states = locationsData.states as StateInput[];

  for (const state of states) {
    // 1. State/Region ကို Upsert ပြုလုပ်ခြင်း
    const createdState = await prisma.stateRegion.upsert({
      where: { nameMm: state.nameMm },
      update: {
        nameEn: state.nameEn,
        type: state.type,
      },
      create: {
        nameMm: state.nameMm,
        nameEn: state.nameEn,
        type: state.type,
      },
    });

    console.log(`📍 State/Region Created/Updated: ${createdState.nameMm}`);

    // 2. Township များကို စစ်ဆေး၍ Insert သို့မဟုတ် Update ပြုလုပ်ခြင်း
    for (const township of state.townships) {
      const existingTownship = await prisma.township.findFirst({
        where: {
          nameMm: township.nameMm,
          stateRegionId: createdState.id,
        },
      });

      if (existingTownship) {
        await prisma.township.update({
          where: { id: existingTownship.id },
          data: {
            nameEn: township.nameEn,
            district: township.district,
          },
        });
      } else {
        await prisma.township.create({
          data: {
            stateRegionId: createdState.id,
            nameMm: township.nameMm,
            nameEn: township.nameEn,
            district: township.district,
          },
        });
      }
    }
  }

  console.log('✅ Seeding completed successfully!');
}

main()
  .catch((e: unknown) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
