// src/scripts/seed.ts
import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from '../config/db';
import { User } from '../models/User';
import { Project } from '../models/Project';
import { Issue } from '../models/Issue';
import { Comment } from '../models/Comment';

// ── Seed Data matching frontend mockData.ts exactly ───────────────────────────
const SEED_USERS = [
  { name: 'Alex Johnson',  email: 'alex@example.com',   password: 'password123', role: 'member' as const },
  { name: 'Blake Smith',   email: 'blake@example.com',  password: 'password123', role: 'member' as const },
  { name: 'Casey Wu',      email: 'casey@example.com',  password: 'password123', role: 'member' as const },
  { name: 'Dana Brown',    email: 'dana@example.com',   password: 'password123', role: 'member' as const },
  { name: 'Jordan Davis',  email: 'jordan@example.com', password: 'password123', role: 'member' as const },
];

async function seed(): Promise<void> {
  await connectDB();
  console.log('\n🌱 Starting database seed…\n');

  // ── Wipe existing data ─────────────────────────────────────────────────────
  await Promise.all([
    User.deleteMany({}),
    Project.deleteMany({}),
    Issue.deleteMany({}),
    Comment.deleteMany({}),
  ]);
  console.log('🗑️  Cleared existing data');

  // ── Create users ───────────────────────────────────────────────────────────
  const users = await User.insertMany(SEED_USERS);
  console.log(`👤 Created ${users.length} users`);

  // Map email → user doc for easy reference
  const userMap = Object.fromEntries(users.map(u => [u.email, u]));
  const u = {
    alex:   userMap['alex@example.com'],
    blake:  userMap['blake@example.com'],
    casey:  userMap['casey@example.com'],
    dana:   userMap['dana@example.com'],
    jordan: userMap['jordan@example.com'],
  };

  // ── Create projects ────────────────────────────────────────────────────────
  const projectDefs = [
    {
      name: 'Website Redesign',
      description: 'Full redesign of the marketing website with new brand identity',
      color: '#4f46e5',
      ownerId: u.alex._id,
      memberIds: [u.alex._id, u.blake._id, u.jordan._id],
    },
    {
      name: 'Mobile App',
      description: 'Cross-platform React Native mobile application for iOS and Android',
      color: '#7c3aed',
      ownerId: u.alex._id,
      memberIds: [u.alex._id, u.casey._id, u.dana._id],
    },
    {
      name: 'API Migration',
      description: 'Migrate legacy REST APIs to GraphQL with backwards compatibility',
      color: '#0891b2',
      ownerId: u.alex._id,
      memberIds: [u.alex._id, u.blake._id, u.casey._id, u.dana._id],
    },
    {
      name: 'Design System',
      description: 'Build a unified component library and design token system',
      color: '#059669',
      ownerId: u.alex._id,
      memberIds: [u.alex._id, u.jordan._id],
    },
    {
      name: 'Data Pipeline',
      description: 'Real-time data processing pipeline with Apache Kafka',
      color: '#dc2626',
      ownerId: u.blake._id,
      memberIds: [u.blake._id, u.casey._id, u.dana._id],
    },
    {
      name: 'Auth Service',
      description: 'Centralized authentication microservice with SSO support',
      color: '#d97706',
      ownerId: u.jordan._id,
      memberIds: [u.alex._id, u.casey._id, u.jordan._id],
    },
  ];

  const projects = await Project.insertMany(projectDefs);
  console.log(`📁 Created ${projects.length} projects`);

  // ── Create issues for each project ────────────────────────────────────────
  const issueDefs = projects.flatMap(project => [
    {
      projectId:   project._id,
      title:       'Add dark mode support',
      description: 'Implement a toggleable dark/light theme using CSS variables and localStorage persistence.\n\n**Criteria:**\n- Toggle in top nav\n- Persist preference\n- All components supported',
      status:      'backlog'      as const,
      priority:    'medium'       as const,
      labels:      ['feature', 'enhancement'],
      assigneeId:  u.blake._id,
      version:     1,
    },
    {
      projectId:   project._id,
      title:       'Optimize image loading',
      description: 'Lazy load all images below the fold. Use next/image or native loading="lazy".\n\n**Target:** LCP under 2.5s on 4G mobile.',
      status:      'backlog'      as const,
      priority:    'high'         as const,
      labels:      ['bug', 'performance'],
      assigneeId:  u.dana._id,
      version:     1,
    },
    {
      projectId:   project._id,
      title:       'Fix navigation menu on mobile',
      description: 'The hamburger menu breaks below 375px. Dropdown overflows on iOS Safari.',
      status:      'in-progress'  as const,
      priority:    'high'         as const,
      labels:      ['bug', 'design'],
      assigneeId:  u.alex._id,
      version:     2,
    },
    {
      projectId:   project._id,
      title:       'Implement JWT refresh tokens',
      description: 'Access tokens expire in 15m. Refresh tokens valid 7d. Silent refresh before expiry.',
      status:      'in-progress'  as const,
      priority:    'critical'     as const,
      labels:      ['feature', 'security'],
      assigneeId:  u.alex._id,
      version:     3,
    },
    {
      projectId:   project._id,
      title:       'Update API documentation',
      description: 'Refresh OpenAPI 3.0 spec. Add examples for all endpoints. Generate Postman collection.',
      status:      'done'         as const,
      priority:    'low'          as const,
      labels:      ['documentation'],
      assigneeId:  u.casey._id,
      version:     1,
    },
    {
      projectId:   project._id,
      title:       'Write unit tests for utils',
      description: 'Achieve 80%+ coverage on the /utils directory. Use Vitest + Testing Library.',
      status:      'backlog'      as const,
      priority:    'medium'       as const,
      labels:      ['testing'],
      assigneeId:  u.jordan._id,
      version:     1,
    },
    {
      projectId:   project._id,
      title:       'Set up CI/CD pipeline',
      description: 'GitHub Actions workflow: lint → test → build → deploy to Vercel on main push.',
      status:      'done'         as const,
      priority:    'high'         as const,
      labels:      ['devops', 'feature'],
      assigneeId:  u.blake._id,
      version:     1,
    },
  ]);

  const allIssues = await Issue.insertMany(issueDefs);
  console.log(`🐛 Created ${allIssues.length} issues`);

  // ── Create seed comments on first project's in-progress issues ────────────
  const firstProjectIssues = allIssues.filter(
    i => i.projectId.toString() === projects[0]._id.toString()
  );
  const navIssue = firstProjectIssues.find(i => i.title.includes('navigation'));
  const jwtIssue = firstProjectIssues.find(i => i.title.includes('JWT'));

  const commentDefs = [
    ...(navIssue ? [
      {
        issueId:  navIssue._id,
        userId:   u.blake._id,
        message:  'Reproduced on iPhone SE (375px). The z-index seems to be the culprit.',
      },
      {
        issueId:  navIssue._id,
        userId:   u.alex._id,
        message:  'I can take this. Will fix the overflow and add proper touch targets.',
      },
    ] : []),
    ...(jwtIssue ? [
      {
        issueId:  jwtIssue._id,
        userId:   u.casey._id,
        message:  'Should we use httpOnly cookies for the refresh token instead of localStorage?',
      },
      {
        issueId:  jwtIssue._id,
        userId:   u.alex._id,
        message:  "Yes, absolutely. HttpOnly + Secure + SameSite=Strict. I'll update the spec.",
      },
      {
        issueId:  jwtIssue._id,
        userId:   u.blake._id,
        message:  'Also consider using rotating refresh tokens for extra security.',
      },
    ] : []),
  ];

  if (commentDefs.length) {
    await Comment.insertMany(commentDefs);
    console.log(`💬 Created ${commentDefs.length} comments`);
  }

  console.log('\n✅ Seed complete!\n');
  console.log('👤 Login credentials (all passwords: password123):');
  SEED_USERS.forEach(u => console.log(`   ${u.role.padEnd(7)} → ${u.email}`));
  console.log('');

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch(err => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
