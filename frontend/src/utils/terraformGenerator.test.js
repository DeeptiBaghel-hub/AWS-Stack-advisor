import assert from 'assert';
import { generateTerraform } from './terraformGenerator.js';

async function run() {
  let passed = 0;

  // Every generated file should have balanced braces — a cheap, real
  // structural check that catches template-interpolation bugs.
  function checkBalanced(files) {
    for (const [name, content] of Object.entries(files)) {
      const opens = (content.match(/{/g) || []).length;
      const closes = (content.match(/}/g) || []).length;
      assert.strictEqual(opens, closes, `${name} has unbalanced braces (${opens} vs ${closes})`);
    }
  }

  // A curated, safe subset produces real resources with no leaked JS
  // artifacts (undefined, [object Object]) anywhere in the output.
  {
    const result = generateTerraform(
      ['AWS Lambda + API Gateway', 'Amazon DynamoDB', 'Amazon S3'],
      'A web API built for how your traffic behaves'
    );
    checkBalanced(result.files);
    assert.deepStrictEqual(result.supported.sort(), ['AWS Lambda + API Gateway', 'Amazon DynamoDB', 'Amazon S3'].sort());
    assert.strictEqual(result.unsupported.length, 0);
    for (const content of Object.values(result.files)) {
      assert.ok(!content.includes('undefined'), 'no leaked "undefined" in output');
      assert.ok(!content.includes('[object Object]'), 'no leaked "[object Object]" in output');
    }
    passed++;
  }

  // Complex, high-risk services are explicitly declined with a real
  // reason, not silently dropped or templated incorrectly.
  {
    const result = generateTerraform(['Amazon EKS', 'Amazon Redshift', 'AWS Glue'], 'Enterprise data platform');
    assert.strictEqual(result.supported.length, 0);
    assert.strictEqual(result.unsupported.length, 3);
    result.unsupported.forEach((u) => {
      assert.ok(u.reason && u.reason.length > 10, `${u.name} should have a real, specific reason`);
    });
    passed++;
  }

  // Security invariant: EC2's SSH ingress CIDR is a required variable
  // with NO default — never silently defaults to an open 0.0.0.0/0.
  {
    const result = generateTerraform(['Amazon EC2 + Auto Scaling + Application Load Balancer'], 'test');
    const varsTf = result.files['variables.tf'];
    assert.ok(varsTf.includes('ssh_cidr'), 'should declare an ssh_cidr variable');
    const sshVarBlock = varsTf.slice(varsTf.indexOf('ssh_cidr') - 20, varsTf.indexOf('ssh_cidr') + 300);
    assert.ok(!sshVarBlock.includes('default'), 'ssh_cidr must have no default — forces explicit operator input');
    passed++;
  }

  // Security invariant: RDS is never publicly accessible, and its
  // password is a required, sensitive variable — never hardcoded.
  {
    const result = generateTerraform(['Amazon RDS'], 'test');
    const mainTf = result.files['main.tf'];
    const varsTf = result.files['variables.tf'];
    assert.ok(mainTf.includes('publicly_accessible    = false'), 'RDS must not be publicly accessible');
    assert.ok(varsTf.includes('sensitive   = true'), 'DB password variable must be marked sensitive');
    assert.ok(!mainTf.match(/password\s*=\s*"[^$][^"]*"/), 'no hardcoded password string anywhere in main.tf');
    passed++;
  }

  // Security invariant: S3 explicitly blocks all public access — not
  // left to bucket ACL defaults, which have historically been a common
  // source of accidental public-data exposure.
  {
    const result = generateTerraform(['Amazon S3'], 'test');
    const mainTf = result.files['main.tf'];
    assert.ok(mainTf.includes('block_public_acls       = true'));
    assert.ok(mainTf.includes('block_public_policy     = true'));
    assert.ok(mainTf.includes('restrict_public_buckets = true'));
    passed++;
  }

  // Compound service names ("Lambda + API Gateway") should match the
  // more specific combined template, not double-generate both Lambda
  // alone AND a separate bare API Gateway resource.
  {
    const result = generateTerraform(['AWS Lambda + API Gateway'], 'test');
    const mainTf = result.files['main.tf'];
    const lambdaCount = (mainTf.match(/resource "aws_lambda_function"/g) || []).length;
    assert.strictEqual(lambdaCount, 1, 'should generate exactly one Lambda function resource, not duplicated');
    assert.ok(mainTf.includes('aws_apigatewayv2_api'), 'should include the API Gateway resource from the combined template');
    passed++;
  }

  // Deduplication: the same service appearing twice (e.g. once required,
  // once mentioned again) should only produce one set of resources.
  {
    const result = generateTerraform(['Amazon S3', 'Amazon S3 (optional)'], 'test');
    const mainTf = result.files['main.tf'];
    const bucketCount = (mainTf.match(/resource "aws_s3_bucket"/g) || []).length;
    assert.strictEqual(bucketCount, 1, 'duplicate service mentions should not produce duplicate resources');
    passed++;
  }

  // The project title should actually flow into resource naming, not
  // leave a literal unsubstituted placeholder.
  {
    const result = generateTerraform(['Amazon DynamoDB'], 'My Cool Project');
    const mainTf = result.files['main.tf'];
    assert.ok(mainTf.includes('my_cool_project'), 'project title should be slugified into resource names');
    passed++;
  }

  console.log(`terraformGenerator: ${passed} checks passed`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
