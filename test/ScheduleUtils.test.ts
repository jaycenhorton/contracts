import { expect } from 'chai';
import { ethers } from 'hardhat';
import { BigNumberish } from 'ethers';
import { ScheduleTestHarness } from '../typechain-types/ScheduleTestHarness';

const NOW = Math.floor(Date.now() / 1000);

const setup = async (): Promise<{
  scheduleTestHarness: ScheduleTestHarness;
}> => {
  const ScheduleTestHarness = await ethers.getContractFactory(
    'ScheduleTestHarness'
  );
  const scheduleTestHarness =
    (await ScheduleTestHarness.deploy()) as ScheduleTestHarness;
  return {
    scheduleTestHarness,
  };
};

describe('Schedule', function () {
  it('Should create a simple Schedule', async function () {
    const { scheduleTestHarness: harness } = await setup();
    expect(harness.create(NOW, NOW + 86400, 1_000_000))
      .to.emit(harness, 'ScheduleCreated')
      .withArgs(0, NOW, NOW + 86400, 1_000_000);
    const schedule: BigNumberish = 0;
    expect(await harness.availableAmount(schedule, 0)).to.equal(0);
    expect(await harness.availableAmount(schedule, NOW - 1)).to.equal(0);
    expect(await harness.availableAmount(schedule, NOW + 86400)).to.equal(
      1_000_000
    );
    expect(await harness.availableAmount(schedule, NOW + 86400 / 2)).to.equal(
      1_000_000 / 2
    );
    expect(await harness.availableAmount(schedule, NOW + 365 * 86400)).to.equal(
      1_000_000
    );
  });

  it('Should create a Schedule with one linear cliff', async function () {
    const { scheduleTestHarness: harness } = await setup();
    await harness.create(NOW, NOW + 86400, 1_000_000);
    const schedule = 0;
    expect(harness.addCliff(schedule, NOW + 86400 / 4, 250_000))
      .to.emit(harness, 'CliffAdded')
      .withArgs(0, NOW + 86400 / 4, 250_000);
    expect(await harness.availableAmount(schedule, NOW - 1)).to.equal(0);
    expect(
      await harness.availableAmount(schedule, NOW + 86400 / 4 - 1)
    ).to.equal(0);
    expect(await harness.availableAmount(schedule, NOW + 86400 / 4)).to.equal(
      250_000
    );
    expect(await harness.availableAmount(schedule, NOW + 86400)).to.equal(
      1_000_000
    );
    expect(await harness.availableAmount(schedule, NOW + 86400 / 2)).to.equal(
      1_000_000 / 2
    );
  });

  it('Should create a Schedule with one sub-linear cliff', async function () {
    const { scheduleTestHarness: harness } = await setup();
    await harness.create(NOW, NOW + 86400, 1_000_000);
    const schedule = 0;
    await harness.addCliff(schedule, NOW + 86400 / 2, 250_000);
    expect(await harness.availableAmount(schedule, NOW - 1)).to.equal(0);
    expect(
      await harness.availableAmount(schedule, NOW + 86400 / 2 - 1)
    ).to.equal(0);
    expect(await harness.availableAmount(schedule, NOW + 86400 / 2)).to.equal(
      250_000
    );
    expect(await harness.availableAmount(schedule, NOW + 86400)).to.equal(
      1_000_000
    );
    expect(
      await harness.availableAmount(schedule, NOW + 86400 * (3 / 4))
    ).to.equal(250_000 + 750_000 / 2);
  });

  it('Should create a Schedule with multiple cliffs', async function () {
    const { scheduleTestHarness: harness } = await setup();
    await harness.create(NOW, NOW + 86400, 1_000_000);
    const schedule = 0;
    await harness.addCliff(schedule, NOW + 86400 / 10, 100_000);
    expect(harness.addCliff(schedule, NOW + 86400 / 5, 100_000))
      .to.emit(harness, 'CliffAdded')
      .withArgs(1, NOW + 86400 / 5, 100_000);
    expect(await harness.availableAmount(schedule, NOW - 1)).to.equal(0);
    expect(
      await harness.availableAmount(schedule, NOW + 86400 / 10 - 1)
    ).to.equal(0);
    expect(await harness.availableAmount(schedule, NOW + 86400 / 10)).to.equal(
      100_000
    );
    expect(
      await harness.availableAmount(schedule, NOW + 86400 / 5 - 1)
    ).to.equal(100_000);
    expect(await harness.availableAmount(schedule, NOW + 86400 / 5)).to.equal(
      200_000
    );
    expect(await harness.availableAmount(schedule, NOW + 86400)).to.equal(
      1_000_000
    );
    expect(await harness.availableAmount(schedule, NOW + 86400 / 2)).to.equal(
      500_000
    );
  });

  it('Should handle truncation of the schedule amount', async function () {
    const { scheduleTestHarness: harness } = await setup();
    await harness.create(NOW, NOW + 86400, 1_000_000);
    const schedule = 0;
    expect(harness.addCliff(schedule, NOW + 86400 / 4, 250_000))
      .to.emit(harness, 'CliffAdded')
      .withArgs(0, NOW + 86400 / 4, 250_000);
    expect(harness.addCliff(schedule, NOW + 86400 / 2, 250_000))
      .to.emit(harness, 'CliffAdded')
      .withArgs(1, NOW + 86400 / 2, 250_000);
    expect(await harness.availableAmount(schedule, NOW + 86400 / 3)).to.equal(
      250_000
    );

    expect(harness.truncateScheduleAmount(schedule, NOW + 86400 / 3))
      .to.emit(harness, 'ScheduleTruncated')
      .withArgs(schedule, 250_000);
    expect(await harness.availableAmount(schedule, NOW + 86400 / 2)).to.equal(
      250_000
    );
    expect(await harness.availableAmount(schedule, NOW + 86400)).to.equal(
      250_000
    );
  });
});