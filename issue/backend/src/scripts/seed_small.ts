// A smaller seed for quick testing (2–3 projects, a few issues).
import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from '../config/db';
import { User } from '../models/User';
import { Project } from '../models/Project';
import { Issue } from '../models/Issue';
import { Comment } from '../models/Comment';

const SEED_USERS = [
  { name: 'Alex Johnson',  email: 'alex@example.com',   password: 'password123', role: 'member' as const },
  { name: 'Blake Smith',   email: 'blake@example.com',  password: 'password123', role: 'member' as const },
  { name: 'Casey Wu',      email: 'casey@example.com',  password: 'password123', role: 'member' as const },
];

async function seedSmall(): Promise<void> {
  await connectDB();
  console.log('\n🌱 Starting small database seed…\n');

  // Wipe existing data
  await Promise.all([
    User.deleteMany({}),
    Project.deleteMany({}),
    Issue.deleteMany({}),
    Comment.deleteMany({}),
  ]);
  console.log('🗑️  Cleared existing data');

  // Users
  const users = await User.insertMany(SEED_USERS);
  console.log(`👤 Created ${users.length} users`);

  const userMap = Object.fromEntries(users.map(u => [u.email, u]));
  const u = {
    alex: userMap['alex@example.com'],
    blake: userMap['blake@example.com'],
    casey: userMap['casey@example.com'],
  };

  // Projects (3)
  const projectDefs = [
    {
      name: 'Website Redesign',
      description: 'Full redesign of the marketing website with new brand identity',
      color: '#4f46e5',
      ownerId: u.alex._id,
      memberIds: [u.alex._id, u.blake._id],
    },
    {
      name: 'Mobile App',
      description: 'Cross-platform React Native mobile application for iOS and Android',
      color: '#7c3aed',
      ownerId: u.alex._id,
      memberIds: [u.alex._id, u.casey._id],
    },
    {
      name: 'API Migration',
      description: 'Migrate legacy REST APIs to GraphQL with backwards compatibility',
      color: '#0891b2',
      ownerId: u.blake._id,
      memberIds: [u.blake._id, u.alex._id, u.casey._id],
    },
  ];

  const projects = await Project.insertMany(projectDefs);
  console.log(`📁 Created ${projects.length} projects`);

  // Issues: 2 per project (6 total)
  const issueDefs = projects.flatMap(project => {
    if (project.name === 'Website Redesign') {
      return [
        {
          projectId: project._id,
          title: 'Add dark mode support',
          description: 'Implement a toggleable dark/light theme and persist preference.',
          status: 'backlog',
          priority: 'medium',
          labels: ['feature', 'enhancement'],
          assigneeId: u.blake._id,
          version: 1,
        },
        {
          projectId: project._id,
          title: 'Optimize image loading',
          description: 'Lazy load images and improve Largest Contentful Paint.',
          status: 'backlog',
          priority: 'high',
          labels: ['bug', 'performance'],
          assigneeId: u.alex._id,
          version: 1,
        },
      ];
    }

    if (project.name === 'Mobile App') {
      return [
        {
          projectId: project._id,
          title: 'Fix navigation menu on mobile',
          description: 'Resolve overflow issues in the navigation dropdown.',
          status: 'in-progress',
          priority: 'high',
          labels: ['bug', 'design'],
          assigneeId: u.casey._id,
          version: 1,
        },
        {
          projectId: project._id,
          title: 'Implement JWT refresh tokens',
          description: 'Add silent token refresh before access token expiry.',
          status: 'in-progress',
          priority: 'critical',
          labels: ['feature', 'security'],
          assigneeId: u.alex._id,
          version: 1,
        },
      ];
    }

    // API Migration
    return [
      {
        projectId: project._id,
        title: 'Update API documentation',
        description: 'Refresh OpenAPI spec and add examples for new endpoints.',
        status: 'done',
        priority: 'low',
        labels: ['documentation'],
        assigneeId: u.casey._id,
        version: 1,
      },
      {
        projectId: project._id,
        title: 'Write unit tests for resolvers',
        description: 'Add tests for GraphQL resolvers and auth middleware.',
        status: 'backlog',
        priority: 'medium',
        labels: ['testing'],
        assigneeId: u.blake._id,
        version: 1,
      },
    ];
  });

  const issues = await Issue.insertMany(issueDefs);
  console.log(`🐛 Created ${issues.length} issues`);

  // A couple comments for one issue (optional)
  const firstInProgress = issues.find(i => i.status === 'in-progress');
  if (firstInProgress) {
    await Comment.insertMany([
      {
        issueId: firstInProgress._id,
        userId: u.alex._id,
        message: 'Quick note: this is a test comment for the small seed.',
      },
    ]);
    console.log('💬 Created 1 comments');
  }

  console.log('\n✅ Small seed complete!\n');
  console.log('👤 Login credentials (all passwords: password123):');
  SEED_USERS.forEach(u => console.log(`   member  → ${u.email}`));
  console.log('');

  await mongoose.disconnect();
  process.exit(0);
}

seedSmall().catch(err => {
  console.error('❌ Small seed failed:', err);
  process.exit(1);
});

