// Pure function: given quiz answers, returns a recommended AWS stack.
// Kept dependency-free and side-effect-free so it's easy to unit test.
//
// rec.diagram is a graph: { nodes: [{id, tag, name, entry?, optional?}], edges: [{from, to, optional?}] }
// so the frontend can lay out real branches (a node with two children, two
// nodes merging into one, etc.) instead of a single straight chain.

const { scoreWellArchitected } = require('./wellArchitectedScorer');

function computeRecommendation(answers) {
  const a = answers || {};
  const rec = { title: '', diagram: { nodes: [], edges: [] }, why: [], footnotes: [] };
  const isEnterprise = a.scale === 'enterprise';
  const isSpiky = a.traffic === 'spiky';

  let seq = 0;
  const nextId = () => `n${seq++}`;

  function addNode({ tag, name, entry, optional }) {
    const id = nextId();
    rec.diagram.nodes.push({ id, tag, name, entry: !!entry, optional: !!optional });
    return id;
  }

  function addEdge(from, to, optional) {
    rec.diagram.edges.push({ from, to, optional: !!optional });
  }

  if (a.workload === 'static') {
    rec.title = 'A static site, delivered fast and globally';
    const visitor = addNode({ tag: 'entry', name: 'Visitor', entry: true });
    const cdn = addNode({ tag: 'delivery', name: 'Amazon CloudFront' });
    const s3 = addNode({ tag: 'hosting', name: 'Amazon S3' });
    addEdge(visitor, cdn);
    addEdge(cdn, s3);

    rec.why.push({ mark: 'delivery', name: 'Amazon CloudFront', text: 'Caches your site at edge locations worldwide, so pages load quickly no matter where visitors are.' });
    rec.why.push({ mark: 'hosting', name: 'Amazon S3', text: 'Hosts the static files themselves — HTML, CSS, JS, images — at very low cost with no servers to patch.' });
    if (a.scale !== 'startup') {
      rec.footnotes.push('If you want CI/CD for this straight from a git repo, AWS Amplify Hosting wraps S3 and CloudFront with build pipelines built in.');
    }
  }

  else if (a.workload === 'web-api') {
    rec.title = 'A web API built for how your traffic behaves';
    let computeName, computeDesc;
    if (a.ops === 'serverless') {
      computeName = 'AWS Lambda + API Gateway';
      computeDesc = 'Your code runs only when a request comes in, and scales instantly — a good match for ' + (isSpiky ? 'bursty traffic, since it scales to zero between spikes and back up in seconds' : 'not paying for idle capacity') + '.';
    } else if (a.ops === 'managed') {
      computeName = isEnterprise ? 'Amazon EKS' : 'Amazon ECS on Fargate';
      computeDesc = isEnterprise
        ? 'Kubernetes gives you the portability and ecosystem larger teams often standardize on, while Fargate-backed nodes remove host management.'
        : 'Runs your containers without you managing EC2 instances underneath — a lighter-weight option than Kubernetes for most teams.';
    } else {
      computeName = 'Amazon EC2 + Auto Scaling + Application Load Balancer';
      computeDesc = 'Gives you full control over the instances, while Auto Scaling and the load balancer still handle distributing and scaling requests.';
    }

    const client = addNode({ tag: 'entry', name: 'Client', entry: true });
    const compute = addNode({ tag: 'compute', name: computeName.split(' + ')[0] + (computeName.includes('+') ? ' +' : '') });
    addEdge(client, compute);
    rec.why.push({ mark: 'compute', name: computeName, text: computeDesc });

    if (a.db === 'relational' || a.db === 'nosql' || a.db === 'unsure') {
      let dbName;
      let dbText;
      if (a.db === 'relational') {
        dbName = isEnterprise ? 'Amazon Aurora' : 'Amazon RDS';
        dbText = isEnterprise
          ? 'A relational database, but with Aurora\'s higher throughput and multi-region read replicas for mission-critical uptime.'
          : 'A managed relational database — handles backups, patching, and failover for structured, transactional data.';
      } else if (a.db === 'nosql') {
        dbName = 'Amazon DynamoDB';
        dbText = 'A fully managed NoSQL store that scales horizontally with demand, and pairs naturally with serverless compute.';
      } else {
        dbName = a.ops === 'serverless' ? 'Amazon DynamoDB' : 'Amazon RDS';
        dbText = 'A safe default given your other choices — you can swap this out once your data shape becomes clearer.';
      }
      const db = addNode({ tag: 'database', name: dbName });
      addEdge(compute, db);
      rec.why.push({ mark: 'database', name: dbName, text: dbText });

      if (isSpiky) {
        const cache = addNode({ tag: 'cache', name: 'Amazon ElastiCache', optional: true });
        addEdge(compute, cache, true);
        rec.why.push({ mark: 'cache', name: 'Amazon ElastiCache (optional)', text: 'Worth adding once read traffic spikes hard enough that hitting the database every time gets expensive — a cache absorbs repeat reads in front of it.' });
      }
    }

    const storage = addNode({ tag: 'storage', name: 'Amazon S3', optional: true });
    addEdge(compute, storage, true);
    rec.why.push({ mark: 'storage', name: 'Amazon S3 (optional)', text: 'Worth adding if you need to store uploaded files, exports, or backups — most APIs end up needing this sooner or later.' });
  }

  else if (a.workload === 'containers') {
    rec.title = 'A home for your containerized services';
    const computeName = isEnterprise ? 'Amazon EKS' : 'Amazon ECS on Fargate';
    const client = addNode({ tag: 'entry', name: 'Client', entry: true });
    const compute = addNode({ tag: 'compute', name: computeName });
    addEdge(client, compute);
    rec.why.push({
      mark: 'compute', name: computeName, text: isEnterprise
        ? 'Kubernetes on EKS suits larger teams that need portability, a large ecosystem of tooling, or already run Kubernetes elsewhere.'
        : 'ECS with Fargate runs your existing containers without managing the underlying servers — simpler to operate than Kubernetes for most teams.'
    });

    if (a.db === 'relational' || a.db === 'nosql') {
      const dbName = a.db === 'relational' ? (isEnterprise ? 'Amazon Aurora' : 'Amazon RDS') : 'Amazon DynamoDB';
      const dbText = a.db === 'relational'
        ? 'Handles structured data with managed backups and failover, so your services don\'t need to run their own database.'
        : 'A managed NoSQL store that scales alongside your services without capacity planning.';
      const db = addNode({ tag: 'database', name: dbName });
      addEdge(compute, db);
      rec.why.push({ mark: 'database', name: dbName, text: dbText });
    }

    const storage = addNode({ tag: 'storage', name: 'Amazon S3', optional: true });
    addEdge(compute, storage, true);
    rec.why.push({ mark: 'storage', name: 'Amazon S3 (optional)', text: 'A common sibling for container workloads that need to read or write artifacts, logs, or exports.' });
  }

  else if (a.workload === 'analytics') {
    rec.title = 'A data lake for querying at scale';
    const sources = addNode({ tag: 'entry', name: 'Data sources', entry: true });
    const s3 = addNode({ tag: 'storage', name: 'Amazon S3' });
    const glue = addNode({ tag: 'etl', name: 'AWS Glue' });
    const athena = addNode({ tag: 'query', name: 'Amazon Athena' });
    addEdge(sources, s3);
    addEdge(s3, glue);
    addEdge(s3, athena);
    addEdge(glue, athena, true);

    rec.why.push({ mark: 'storage', name: 'Amazon S3', text: 'Serves as the data lake — cheap, durable storage that every other analytics service reads from directly.' });
    rec.why.push({ mark: 'etl', name: 'AWS Glue', text: 'Crawls and transforms raw data into a clean, queryable format without you managing ETL servers.' });
    rec.why.push({ mark: 'query', name: 'Amazon Athena', text: 'Runs SQL queries directly against S3 using Glue\'s catalog, so you pay per query instead of running a database around the clock.' });
    if (isEnterprise) {
      rec.footnotes.push('At enterprise scale with recurring, complex joins across huge datasets, Amazon Redshift or EMR may end up cheaper than paying per-query with Athena — worth benchmarking both.');
    }
  }

  else if (a.workload === 'ml') {
    rec.title = 'A pipeline for training and serving models';
    const data = addNode({ tag: 'entry', name: 'Training data', entry: true });
    const s3 = addNode({ tag: 'storage', name: 'Amazon S3' });
    const sagemaker = addNode({ tag: 'ml', name: 'Amazon SageMaker' });
    const endpoint = addNode({ tag: 'serving', name: 'SageMaker Endpoint' });
    addEdge(data, s3);
    addEdge(s3, sagemaker);
    addEdge(sagemaker, endpoint);

    rec.why.push({ mark: 'storage', name: 'Amazon S3', text: 'Holds your training datasets and model artifacts — the standard input/output store for SageMaker.' });
    rec.why.push({ mark: 'ml', name: 'Amazon SageMaker', text: 'Manages the training infrastructure and notebook environment, so you\'re not provisioning GPU instances by hand.' });
    rec.why.push({ mark: 'serving', name: 'SageMaker Endpoint', text: 'Hosts your trained model behind a managed, auto-scaling API for real-time predictions.' });
  }

  else if (a.workload === 'iot') {
    rec.title = 'An ingestion path for device data';
    const devices = addNode({ tag: 'entry', name: 'Devices', entry: true });
    const iotCore = addNode({ tag: 'ingest', name: 'AWS IoT Core' });
    const compute = addNode({ tag: 'compute', name: 'AWS Lambda' });
    addEdge(devices, iotCore);
    addEdge(iotCore, compute);

    rec.why.push({ mark: 'ingest', name: 'AWS IoT Core', text: 'Handles device connections, authentication, and message routing at scale, over MQTT or HTTP.' });
    rec.why.push({ mark: 'compute', name: 'AWS Lambda', text: 'Processes each incoming message on the fly — reshaping, filtering, or forwarding it — without a server running 24/7.' });

    if (a.db === 'nosql' || a.db === 'unsure' || a.db === 'relational') {
      const dbName = a.db === 'relational' ? 'Amazon RDS' : 'Amazon DynamoDB';
      const dbText = a.db === 'relational'
        ? 'Stores structured device or account data alongside the telemetry stream.'
        : 'A good fit for device telemetry — high write throughput and flexible schemas as your device fleet evolves.';
      const db = addNode({ tag: 'database', name: dbName });
      addEdge(compute, db);
      rec.why.push({ mark: 'database', name: dbName, text: dbText });
    }

    const archive = addNode({ tag: 'storage', name: 'Amazon S3', optional: true });
    addEdge(iotCore, archive, true);
    rec.why.push({ mark: 'storage', name: 'Amazon S3 (optional)', text: 'A common parallel path — an IoT rule archives raw messages here for replay or later analysis, separate from the live processing path.' });
  }

  else if (a.workload === 'batch') {
    rec.title = 'A pipeline for scheduled or on-demand jobs';
    const trigger = addNode({ tag: 'entry', name: 'Trigger / schedule', entry: true });
    let compute;
    if (a.ops === 'serverless') {
      const orchestration = addNode({ tag: 'orchestration', name: 'AWS Step Functions' });
      compute = addNode({ tag: 'compute', name: 'AWS Lambda' });
      addEdge(trigger, orchestration);
      addEdge(orchestration, compute);
      rec.why.push({ mark: 'orchestration', name: 'AWS Step Functions', text: 'Coordinates multi-step jobs visually, retrying and branching without you writing orchestration glue code.' });
      rec.why.push({ mark: 'compute', name: 'AWS Lambda', text: 'Runs each step of the job — well suited if individual tasks finish in minutes, not hours.' });
    } else {
      compute = addNode({ tag: 'compute', name: 'AWS Batch' });
      addEdge(trigger, compute);
      rec.why.push({ mark: 'compute', name: 'AWS Batch', text: 'Provisions the right amount of compute for jobs that run longer or need more resources than Lambda allows, then scales back down.' });
    }
    if (a.db && a.db !== 'none') {
      const storage = addNode({ tag: 'storage', name: 'Amazon S3' });
      addEdge(compute, storage);
      rec.why.push({ mark: 'storage', name: 'Amazon S3', text: 'A natural place to land input and output files for batch jobs, regardless of what else you store in a database.' });
    }
  }

  else {
    rec.title = 'A starting point for your architecture';
    addNode({ tag: 'entry', name: 'Client', entry: true });
    rec.why.push({ mark: 'note', name: 'More detail needed', text: 'Answer the workload question so the advisor knows what you\'re building.' });
  }

  rec.footnotes.push('Amazon CloudWatch and IAM apply to almost every stack — for monitoring/alarms and access control, respectively.');
  rec.wellArchitected = scoreWellArchitected(a);
  return rec;
}

module.exports = { computeRecommendation };
