import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const klass = await prisma.class.upsert({
    where: { code: "CS440" },
    update: {},
    create: { code: "CS440", name: "Demo Class" },
  });

  const demoStudents = [
    { firstName: "Jane", lastName: "Doe", emailUsername: "jdoe123", campusId: "A10000001" },
    { firstName: "John", lastName: "Smith", emailUsername: "jsmith45", campusId: "A10000002" },
    { firstName: "Amy", lastName: "Lee", emailUsername: "alee78", campusId: "A10000003" },
  ];

  for (const s of demoStudents) {
    const student = await prisma.student.upsert({
      where: { emailUsername: s.emailUsername },
      update: s,
      create: s,
    });
    await prisma.enrollment.upsert({
      where: { studentId_classId: { studentId: student.id, classId: klass.id } },
      update: {},
      create: { studentId: student.id, classId: klass.id },
    });
  }

  await prisma.poll.upsert({
    where: { classId_number: { classId: klass.id, number: 1 } },
    update: {},
    create: {
      classId: klass.id,
      number: 1,
      sortOrder: 1,
      label: "Demo poll",
      numChoices: 4,
      isActive: true,
    },
  });

  console.log("Seeded demo class CS440 with 3 students and 1 active poll.");
  console.log("Try logging in as: jdoe123 / A10000001");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
