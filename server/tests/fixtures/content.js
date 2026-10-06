// Made-up content, shaped like the files in shared/data, used to test the seed and the
// repositories without depending on the real profile. Rich on purpose: every optional field
// is used somewhere and left out somewhere else.

export const skills = {
  categories: [
    {
      id: 'frontend',
      label: 'Frontend',
      skills: [
        { id: 'react', name: 'React', level: 'advanced', description: 'Daily driver.' },
        { id: 'css', name: 'CSS', level: null, description: '' },
      ],
    },
    {
      id: 'backend',
      label: 'Backend',
      skills: [{ id: 'node-js', name: 'Node.js', level: 'intermediate', description: '' }],
    },
    {
      id: 'database',
      label: 'Database',
      skills: [{ id: 'postgresql', name: 'PostgreSQL', level: 'familiar', description: 'SQL.' }],
    },
  ],
};

export const projects = {
  projects: [
    {
      slug: 'full-project',
      title: 'Full Project',
      summary: 'Everything filled in.',
      description: 'A long description.\n\nWith a second paragraph.',
      problem: 'The problem.',
      solution: 'The solution.',
      features: ['Fast', 'Accessible'],
      architecture: {
        description: 'Three layers.',
        layers: [
          { name: 'Client', detail: 'React' },
          { name: 'API', detail: '' },
        ],
      },
      challenges: 'Hard parts.',
      lessons: 'Learned things.',
      category: 'Full-Stack',
      status: 'completed',
      year: 2025,
      thumbnail: {
        url: '/images/full.png',
        alt: '',
        caption: 'Home page',
        width: 800,
        height: 600,
      },
      screenshots: [
        { url: 'https://example.org/one.png', alt: 'First view', caption: '' },
        { url: '/images/two.png', alt: '', caption: 'Second view', width: 400, height: 300 },
      ],
      repoUrl: 'https://github.com/example/full',
      demoUrl: 'https://full.example.org',
      technologies: ['React', 'Vite', 'node.js'],
      featured: true,
      published: true,
      sortOrder: 2,
    },
    {
      slug: 'minimal-project',
      title: 'Minimal Project',
      summary: 'Only the required fields.',
      technologies: [],
      published: true,
      sortOrder: 1,
    },
    {
      slug: 'hidden-project',
      title: 'Hidden Project',
      summary: 'Not published.',
      technologies: ['Secret Tech'],
      published: false,
      sortOrder: 0,
    },
  ],
};

export const experiences = {
  experiences: [
    {
      id: 'old-job',
      position: 'Junior Developer',
      organization: 'Old Co',
      type: 'employment',
      startDate: '2022-01',
      endDate: '2023-06',
      description: 'Built things.',
      responsibilities: ['Wrote code', 'Fixed bugs'],
      technologies: ['React', 'Docker'],
    },
    {
      id: 'current-role',
      position: 'Developer',
      organization: 'New Co',
      type: null,
      startDate: '2024-02',
      endDate: null,
      technologies: ['PostgreSQL'],
      sortOrder: 1,
    },
    {
      id: 'hidden-role',
      position: 'Hidden',
      organization: 'X',
      startDate: '2020-01',
      visible: false,
    },
  ],
};

export const education = {
  education: [
    {
      id: 'university',
      institution: 'Some University',
      program: 'Informatics',
      startYear: 2023,
      endYear: null,
      subjects: ['Algorithms', 'Databases'],
      achievements: ['Dean’s list'],
    },
    {
      id: 'high-school',
      institution: 'Some School',
      program: 'Science',
      startYear: 2020,
      endYear: 2023,
      sortOrder: 2,
    },
    { id: 'hidden-school', institution: 'X', program: 'Y', startYear: 2000, visible: false },
  ],
};

export const certificates = {
  certificates: [
    {
      id: 'cert-pdf',
      title: 'Web Course',
      issuer: 'Academy',
      issuedDate: '2025-03',
      category: 'Web',
      credentialId: 'ABC-123',
      credentialUrl: 'https://academy.example.org/verify/ABC-123',
      file: { url: '/certificates/web.pdf?v=2', alt: '' },
    },
    {
      id: 'cert-image',
      title: 'Cloud Basics',
      issuer: 'Cloud Inc',
      issuedDate: '2025-06',
      file: { url: 'https://example.org/cloud.png', alt: 'Scan of the certificate' },
    },
    {
      id: 'cert-plain',
      title: 'Older Course',
      issuer: 'Academy',
      issuedDate: '2024-01',
      sortOrder: 1,
    },
    { id: 'cert-hidden', title: 'Hidden', issuer: 'X', issuedDate: '2020-01', visible: false },
  ],
};

const post = (header, body) =>
  `---\n${Object.entries(header)
    .map(([key, value]) => `${key}: ${value}`)
    .join('\n')}\n---\n\n${body}\n`;

export const postFiles = [
  {
    path: 'posts/first-post.md',
    raw: post(
      {
        title: 'First Post',
        excerpt: 'The very first one.',
        category: 'Engineering',
        tags: 'React, Node',
        publishedAt: '2025-03-01',
      },
      'Some words here about databases.',
    ),
  },
  {
    path: 'posts/second-post.md',
    raw: post(
      {
        title: 'Second Post',
        category: 'Engineering',
        tags: 'node, Testing',
        publishedAt: '2025-04-10',
        updatedAt: '2025-05-01',
        coverImage: '/images/cover.png',
        coverAlt: 'A cover',
      },
      `${'word '.repeat(450)}end`,
    ),
  },
  {
    path: 'posts/third-post.md',
    raw: post(
      {
        title: 'Third Post',
        category: 'Life',
        publishedAt: '2025-04-11',
        coverImage: 'https://example.org/c.png',
      },
      'Short.',
    ),
  },
];

/** The same content as plain objects, by file name, for writing a temporary data folder. */
export const dataFiles = {
  'skills.json': skills,
  'projects.json': projects,
  'experiences.json': experiences,
  'education.json': education,
  'certificates.json': certificates,
};
