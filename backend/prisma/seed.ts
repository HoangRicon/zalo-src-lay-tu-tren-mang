import bcrypt from 'bcryptjs';
import { pathToFileURL } from 'node:url';

export const DEFAULT_ADMIN_EMAIL = 'admin@zalo.local';
export const DEFAULT_ADMIN_PASSWORD = 'admin123';
export const DEFAULT_ADMIN_FULL_NAME = 'System Admin';
export const DEFAULT_ORGANIZATION_NAME = 'Zalo CRM';

type ExistingOrg = {
  id: string;
  name: string;
} | null;

type ExistingUser = {
  id: string;
  email: string;
  role: string;
  orgId: string;
} | null;

type BuildSeedPlanInput = {
  needsSetup: boolean;
  existingOrg: ExistingOrg;
  existingUser: ExistingUser;
};

type SeedPlan = {
  organization: {
    id?: string;
    name: string;
    shouldCreate: boolean;
  };
  user: {
    id?: string;
    orgId?: string;
    email: string;
    password: string;
    fullName: string;
    role: 'owner' | 'admin';
    shouldCreate: boolean;
  };
};

export function buildSeedPlan(input: BuildSeedPlanInput): SeedPlan {
  const organizationId = input.existingUser?.orgId ?? input.existingOrg?.id;
  const role =
    input.needsSetup || input.existingUser?.role === 'owner'
      ? 'owner'
      : 'admin';

  return {
    organization: {
      id: input.existingOrg?.id,
      name: input.existingOrg?.name ?? DEFAULT_ORGANIZATION_NAME,
      shouldCreate: !input.existingOrg,
    },
    user: {
      id: input.existingUser?.id,
      orgId: organizationId,
      email: DEFAULT_ADMIN_EMAIL,
      password: DEFAULT_ADMIN_PASSWORD,
      fullName: DEFAULT_ADMIN_FULL_NAME,
      role,
      shouldCreate: !input.existingUser,
    },
  };
}

export async function runSeed() {
  const { prisma } = await import('../src/shared/database/prisma-client.js');
  const [userCount, existingOrg, existingUser] = await Promise.all([
    prisma.user.count(),
    prisma.organization.findFirst({
      orderBy: { createdAt: 'asc' },
      select: { id: true, name: true },
    }),
    prisma.user.findUnique({
      where: { email: DEFAULT_ADMIN_EMAIL },
      select: { id: true, email: true, role: true, orgId: true },
    }),
  ]);

  const plan = buildSeedPlan({
    needsSetup: userCount === 0,
    existingOrg,
    existingUser,
  });
  const passwordHash = await bcrypt.hash(plan.user.password, 12);

  if (plan.organization.shouldCreate) {
    const created = await prisma.$transaction(async (tx) => {
      const organization = await tx.organization.create({
        data: { name: plan.organization.name },
      });

      const user = await tx.user.create({
        data: {
          orgId: organization.id,
          email: plan.user.email,
          passwordHash,
          fullName: plan.user.fullName,
          role: plan.user.role,
          isActive: true,
        },
        select: {
          id: true,
          email: true,
          role: true,
          orgId: true,
        },
      });

      return { organization, user };
    });

    return {
      action: 'created_org_and_user' as const,
      organizationId: created.organization.id,
      email: created.user.email,
      role: created.user.role,
      password: DEFAULT_ADMIN_PASSWORD,
    };
  }

  if (plan.user.shouldCreate) {
    const user = await prisma.user.create({
      data: {
        orgId: plan.user.orgId!,
        email: plan.user.email,
        passwordHash,
        fullName: plan.user.fullName,
        role: plan.user.role,
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        role: true,
        orgId: true,
      },
    });

    return {
      action: 'created_user' as const,
      organizationId: user.orgId,
      email: user.email,
      role: user.role,
      password: DEFAULT_ADMIN_PASSWORD,
    };
  }

  const user = await prisma.user.update({
    where: { id: plan.user.id! },
    data: {
      fullName: plan.user.fullName,
      passwordHash,
      role: plan.user.role,
      isActive: true,
    },
    select: {
      id: true,
      email: true,
      role: true,
      orgId: true,
    },
  });

  return {
    action: 'updated_user' as const,
    organizationId: user.orgId,
    email: user.email,
    role: user.role,
    password: DEFAULT_ADMIN_PASSWORD,
  };
}

async function main() {
  const { prisma } = await import('../src/shared/database/prisma-client.js');
  try {
    const result = await runSeed();
    console.log(
      [
        'Bootstrap admin ready.',
        `Action: ${result.action}`,
        `Email: ${result.email}`,
        `Password: ${result.password}`,
        `Role: ${result.role}`,
        `Organization: ${result.organizationId}`,
      ].join('\n'),
    );
  } finally {
    await prisma.$disconnect();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error('Failed to seed admin account.');
    console.error(error);
    process.exitCode = 1;
  });
}
