// Hand-written verdicts for the comparisons people actually search for.
// The compare endpoint always returns the raw attribute diff (generated
// from the catalog itself); this curated layer adds an opinionated verdict
// on top, when one exists for the pair being compared.

const comparisons = [
  {
    slugA: 'aws-lambda',
    slugB: 'amazon-ec2',
    chooseA: 'Choose Lambda when your workload is event-driven, traffic is spiky or unpredictable, and you don\'t want to think about servers at all.',
    chooseB: 'Choose EC2 when you need long-running processes, specific OS-level control, or workloads that run steadily enough that paying for a reserved instance beats paying per-invocation.',
    verdict: 'This isn\'t really "which is better" — it\'s "which billing and operational model fits." Lambda wins on operational simplicity and cost at low-to-moderate, bursty traffic. EC2 wins once you have steady, predictable load where a reserved or spot instance is cheaper than the equivalent Lambda invocations, or when you need something Lambda\'s execution model can\'t do (long-running processes, custom OS-level dependencies, specific networking setups).',
  },
  {
    slugA: 'amazon-ecs',
    slugB: 'amazon-eks',
    chooseA: 'Choose ECS if you\'re AWS-only, want a simpler learning curve, and don\'t need Kubernetes\'s ecosystem or multi-cloud portability.',
    chooseB: 'Choose EKS if you\'re standardizing on Kubernetes across teams or clouds, need its large ecosystem of tools (Helm, operators, service meshes), or are migrating from an existing Kubernetes setup.',
    verdict: 'ECS is the pragmatic default for teams that live entirely in AWS and want containers running with the least operational overhead. EKS makes sense once Kubernetes itself is a requirement — either because you need portability across cloud providers, or because your team already has Kubernetes expertise and tooling built around it. EKS\'s control plane fee and steeper learning curve are the real cost of that portability.',
  },
  {
    slugA: 'amazon-rds',
    slugB: 'amazon-aurora',
    chooseA: 'Choose RDS when you want a standard, portable relational engine (including ones Aurora doesn\'t support, like SQL Server or Oracle) at a lower baseline cost.',
    chooseB: 'Choose Aurora when you\'re on MySQL or PostgreSQL and need higher throughput, faster failover, or more read replicas than RDS comfortably supports.',
    verdict: 'Aurora is AWS\'s own re-engineering of MySQL/PostgreSQL for the cloud — same wire protocol, different storage engine underneath, built for higher throughput and faster recovery. It costs more per instance-hour than equivalent RDS instances, so the decision usually comes down to whether you\'re already hitting RDS\'s ceiling. Most new projects start on RDS and migrate to Aurora if they actually need the extra headroom, rather than starting there by default.',
  },
  {
    slugA: 'amazon-dynamodb',
    slugB: 'amazon-rds',
    chooseA: 'Choose DynamoDB when access patterns are known upfront, you need to scale horizontally with no capacity planning, and you\'re comfortable designing around key-value/document access rather than joins.',
    chooseB: 'Choose RDS when your data is naturally relational, you need ad-hoc queries and joins, or your team already thinks in SQL.',
    verdict: 'This is less "which is faster" and more "which data model fits." DynamoDB rewards you with near-limitless horizontal scaling and predictable low latency, but only if you design your access patterns before you design your schema — retrofitting a new query pattern onto an existing DynamoDB table is genuinely hard. RDS lets you query however you want after the fact, at the cost of needing to manage scaling yourself as load grows. Teams building fast on unclear requirements often start with RDS for the flexibility; teams with a well-understood, high-scale access pattern (e.g. "get this user\'s data by ID") often do better starting with DynamoDB.',
  },
];

module.exports = comparisons;
