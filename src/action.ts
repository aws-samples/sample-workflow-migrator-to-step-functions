import * as core from '@actions/core';
import * as fs from 'fs';
import { convertConductorToASL } from './mappers/conductor-to-asl';
import { parseConductorWorkflow } from './parsers/conductor';

async function run(): Promise<void> {
  try {
    const source = core.getInput('source', { required: true });
    const target = core.getInput('target', { required: true });
    const format = core.getInput('format') || 'conductor';

    if (!fs.existsSync(source)) {
      core.setFailed(`Source file not found: ${source}`);
      return;
    }

    core.info(`Converting ${source} (${format}) -> ${target} (ASL)`);

    if (format !== 'conductor') {
      core.setFailed(`Format '${format}' is not yet supported. Currently supported: conductor. Coming soon: camunda, airflow, temporal.`);
      return;
    }

    const sourceContent = fs.readFileSync(source, 'utf-8');
    const workflow = parseConductorWorkflow(sourceContent);
    const result = convertConductorToASL(workflow);
    const aslJson = JSON.stringify(result.stateMachine, null, 2);

    // Write output file
    fs.writeFileSync(target, aslJson);
    core.info(`ASL written to ${target}`);

    // Set outputs
    const statesCount = Object.keys(result.stateMachine.States || {}).length;
    core.setOutput('asl-file', target);
    core.setOutput('states-count', statesCount.toString());
    core.setOutput('warnings', JSON.stringify(result.warnings || []));

    if (result.warnings && result.warnings.length > 0) {
      core.warning(`Conversion produced ${result.warnings.length} warning(s)`);
      result.warnings.forEach((w: string) => core.warning(w));
    }

    core.info(`Conversion complete: ${statesCount} states generated`);
  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(error.message);
    } else {
      core.setFailed('An unexpected error occurred');
    }
  }
}

run();
