const { PrismaClient } = require('../src/generated/prisma');

const prisma = new PrismaClient();

async function main() {
  // Create default categories
  const categories = [
    { name: 'Politics', description: 'Political discussions and debates' },
    { name: 'Technology', description: 'Technology-related topics and innovations' },
    { name: 'Society', description: 'Social issues and cultural discussions' },
    { name: 'Environment', description: 'Environmental issues and sustainability' },
    { name: 'Economics', description: 'Economic policies and financial discussions' },
    { name: 'Education', description: 'Educational policies and learning methods' },
    { name: 'Health', description: 'Healthcare and medical discussions' }
  ];

  for (const category of categories) {
    await prisma.category.upsert({
      where: { name: category.name },
      update: {},
      create: category
    });
  }

  console.log('Seed data created successfully');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 