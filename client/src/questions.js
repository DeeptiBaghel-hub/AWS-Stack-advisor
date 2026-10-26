const questions = [
  {
    id: 'workload',
    tag: 'workload',
    title: 'What are you building?',
    options: [
      { v: 'web-api', label: 'A web app or API', desc: 'Backend that serves requests from a browser or app' },
      { v: 'static', label: 'A static site or landing page', desc: 'HTML/CSS/JS, no server-side logic' },
      { v: 'containers', label: 'Containerized microservices', desc: 'Already packaged as Docker images' },
      { v: 'analytics', label: 'Data analytics / a data lake', desc: 'Querying and transforming large datasets' },
      { v: 'ml', label: 'A machine learning workload', desc: 'Training or serving models' },
      { v: 'iot', label: 'IoT / device data ingestion', desc: 'Streams from sensors or connected devices' },
      { v: 'batch', label: 'Scheduled or batch jobs', desc: 'Runs on a timer or on-demand, no live users' },
    ],
  },
  {
    id: 'ops',
    tag: 'operations',
    title: 'How much do you want to manage servers yourself?',
    options: [
      { v: 'serverless', label: 'None — fully serverless', desc: "I don't want to think about servers at all" },
      { v: 'managed', label: 'Some — managed containers', desc: "I'll package my app, AWS handles the hosts" },
      { v: 'full-control', label: 'Full control', desc: 'I want to configure the underlying instances myself' },
    ],
  },
  {
    id: 'traffic',
    tag: 'traffic',
    title: 'What does your traffic pattern look like?',
    options: [
      { v: 'steady', label: 'Steady and predictable', desc: 'Fairly constant load, easy to forecast' },
      { v: 'spiky', label: 'Spiky or bursty', desc: 'Sudden surges, then quiet periods' },
      { v: 'low', label: 'Low or occasional', desc: 'Light usage, maybe just getting started' },
      { v: 'unsure', label: 'Not sure yet', desc: 'Too early to say' },
    ],
  },
  {
    id: 'db',
    tag: 'data',
    title: 'Do you need a database?',
    options: [
      { v: 'relational', label: 'Yes, structured / relational', desc: 'Rows, joins, transactions — SQL-shaped data' },
      { v: 'nosql', label: 'Yes, flexible / NoSQL', desc: 'Key-value or document data, needs to scale wide' },
      { v: 'none', label: 'No, just files or objects', desc: 'Storing images, documents, backups, etc.' },
      { v: 'unsure', label: 'Not sure yet', desc: 'Happy to go with a sensible default' },
    ],
  },
  {
    id: 'scale',
    tag: 'stage',
    title: 'What stage is this project at?',
    options: [
      { v: 'startup', label: 'Startup / prototype', desc: 'Validating an idea, cost matters a lot' },
      { v: 'growing', label: 'Growing product', desc: 'Real users, needs room to scale' },
      { v: 'enterprise', label: 'Enterprise / mission-critical', desc: 'High availability and compliance matter' },
    ],
  },
];

export default questions;
