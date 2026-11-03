// High-Availability (HA) & Disaster Recovery (DR) Transformation Engine
// Upgrades an architecture stack across Single-AZ, Multi-AZ, and Multi-Region
// tiers based on AWS Certified Solutions Architect Professional RTO/RPO principles.

export const HA_TIERS = {
  'single-az': {
    id: 'single-az',
    label: 'Single-AZ',
    badge: 'Dev / Low Cost',
    rto: 'Hours (Manual rebuild)',
    rpo: 'Hours (Last snapshot)',
    description: 'Cost-optimized deployment in a single Availability Zone. Ideal for development and non-critical workloads, but vulnerable to data center outages.',
  },
  'multi-az': {
    id: 'multi-az',
    label: 'Multi-AZ Active-Passive',
    badge: 'Standard Production',
    rto: '< 2 mins (Automated failover)',
    rpo: '0 (Synchronous replication)',
    description: 'Automatic failover across 2–3 Availability Zones within the same region. Protects against hardware faults and AZ power/cooling disruptions with zero data loss.',
  },
  'multi-region': {
    id: 'multi-region',
    label: 'Multi-Region Active-Active',
    badge: 'Mission-Critical Enterprise',
    rto: 'Near-Zero (< 30s DNS failover)',
    rpo: '< 1s (Async cross-region replication)',
    description: 'Active-Active multi-region deployment with Route 53 latency/health routing, Aurora Global Database or DynamoDB Global Tables, and S3 Cross-Region Replication (CRR).',
  },
};

export function applyHaTierToRecommendation(baseRecommendation, tierId) {
  if (!baseRecommendation) return null;
  const tier = HA_TIERS[tierId] || HA_TIERS['single-az'];

  // Deep clone
  const rec = JSON.parse(JSON.stringify(baseRecommendation));
  rec.haTier = tier;

  if (tierId === 'single-az') {
    rec.title = `${baseRecommendation.title} (Single-AZ)`;
    rec.nodes = (rec.diagram?.nodes || []).map((n) => {
      if (n.name.includes('RDS')) n.name = 'Amazon RDS (Single-AZ)';
      return n;
    });
    return rec;
  }

  if (tierId === 'multi-az') {
    rec.title = `${baseRecommendation.title} (Multi-AZ Resilient)`;
    (rec.diagram?.nodes || []).forEach((n) => {
      if (n.name.includes('RDS')) {
        n.name = 'Amazon RDS (Multi-AZ Standby)';
      } else if (n.name.includes('Aurora')) {
        n.name = 'Amazon Aurora (Multi-AZ Cluster)';
      } else if (n.tag === 'compute') {
        n.name = `${n.name} (Multi-AZ Fleet)`;
      }
    });

    rec.why = rec.why.map((w) => {
      if (w.name.includes('RDS')) {
        return {
          ...w,
          name: 'Amazon RDS (Multi-AZ Standby)',
          text: `${w.text} Configured with synchronous replication to a standby instance in a second Availability Zone for automated failover in under 2 minutes.`,
        };
      }
      return w;
    });

    rec.footnotes = [
      ...rec.footnotes,
      'Multi-AZ synchronous replication ensures zero Recovery Point Objective (RPO=0) within the region without manual DNS adjustments.',
    ];
    return rec;
  }

  if (tierId === 'multi-region') {
    rec.title = `${baseRecommendation.title} (Multi-Region Active-Active)`;

    // Detect existing database and compute types
    const hasDynamo = (rec.diagram?.nodes || []).some((n) => (n.name || '').toLowerCase().includes('dynamodb'));
    const hasRds = (rec.diagram?.nodes || []).some((n) => (n.name || '').toLowerCase().includes('rds') || (n.name || '').toLowerCase().includes('aurora'));
    const hasS3 = (rec.diagram?.nodes || []).some((n) => (n.name || '').toLowerCase().includes('s3'));
    const hasCache = (rec.diagram?.nodes || []).some((n) => (n.name || '').toLowerCase().includes('elasticache'));
    const computeNode = (rec.diagram?.nodes || []).find((n) => n.tag === 'compute');
    const computeName = computeNode ? computeNode.name.replace(/\s*\+.*$/, '') : 'Compute';

    const globalDbName = hasDynamo
      ? 'Amazon DynamoDB Global Tables'
      : hasRds
        ? 'Amazon Aurora Global Database'
        : null;

    // Build brand new Multi-Region topology graph
    const nodes = [
      { id: 'r53', tag: 'entry', name: 'Route 53 (Health DNS)', entry: true },
      { id: 'reg1', tag: 'compute', name: `${computeName} (Primary Region)` },
      { id: 'reg2', tag: 'compute', name: `${computeName} (Secondary Region)` },
    ];

    const edges = [
      { from: 'r53', to: 'reg1' },
      { from: 'r53', to: 'reg2' },
    ];

    if (globalDbName) {
      nodes.push({ id: 'gdb', tag: 'database', name: globalDbName });
      edges.push({ from: 'reg1', to: 'gdb' });
      edges.push({ from: 'reg2', to: 'gdb' });
    }

    if (hasS3) {
      nodes.push({ id: 's3crr', tag: 'storage', name: 'Amazon S3 (Cross-Region CRR)', optional: true });
      edges.push({ from: 'reg1', to: 's3crr', optional: true });
      edges.push({ from: 'reg2', to: 's3crr', optional: true });
    }

    if (hasCache) {
      nodes.push({ id: 'cache', tag: 'cache', name: 'ElastiCache (Regional)', optional: true });
      edges.push({ from: 'reg1', to: 'cache', optional: true });
      edges.push({ from: 'reg2', to: 'cache', optional: true });
    }

    rec.diagram = { nodes, edges };

    // Update Why cards
    rec.why = [
      {
        mark: 'entry',
        name: 'Amazon Route 53 Application Recovery Controller',
        text: 'Routes global end-user traffic to the healthiest AWS region using latency-based routing and automated DNS health checks.',
      },
      {
        mark: 'compute',
        name: `${computeName} (Dual-Region Ingestion)`,
        text: 'Identical, autoscaling compute fleets running in both regions to process regional user requests with sub-10ms response times.',
      },
    ];

    if (globalDbName) {
      rec.why.push({
        mark: 'database',
        name: globalDbName,
        text: hasDynamo
          ? 'Fully managed active-active multi-region replication providing local read and write speeds worldwide with conflict resolution.'
          : 'Replicates storage volume physically across regions in under 1 second without impacting primary instance transaction throughput.',
      });
    }

    if (hasS3) {
      rec.why.push({
        mark: 'storage',
        name: 'Amazon S3 Cross-Region Replication (CRR)',
        text: 'Asynchronously replicates bucket objects, metadata, and ACLs across distinct AWS regions for disaster resilience.',
      });
    }

    rec.footnotes = [
      ...rec.footnotes,
      'Multi-Region Active-Active ensures near-zero RTO and sub-second RPO, guarded against total regional AWS outages.',
    ];

    return rec;
  }

  return rec;
}
