import { createServer, type Server } from 'node:http';
import { expect, test } from '@playwright/test';
import { demoUser, sql } from './support';

/**
 * A car added from its VIN alone, and the recalls that come with it. NHTSA is a stand-in
 * here, on the port `tests/run.sh` gives the server as `NHTSA_BASE`; the API suite
 * (`tests/nhtsa.test.ts`) checks the normalization in detail, so this checks what only a
 * browser can: the form filling itself, and leaving alone what the owner typed.
 */

const VIN = '1J4FY19S5MP123456';
let nhtsa: Server;

test.beforeAll(async () => {
	nhtsa = createServer((request, response) => {
		const url = new URL(request.url ?? '/', 'http://stand-in');
		const body = url.pathname.startsWith('/api/vehicles/GetModelsForMake')
			? { Results: ['Wrangler', 'Cherokee', 'Comanche'].map((Model_Name) => ({ Model_Name })) }
			: url.pathname.startsWith('/api/vehicles/DecodeVinValues/')
				? {
						Results: [
							{
								ModelYear: '1991',
								Make: 'JEEP',
								Model: 'Wrangler',
								Trim: 'S',
								BodyClass: 'Sport Utility Vehicle (SUV)/Multipurpose Vehicle (MPV)',
								DisplacementL: '4',
								EngineCylinders: '6',
								EngineConfiguration: 'In-Line',
								FuelTypePrimary: 'Gasoline',
								DriveType: '4WD/4-Wheel Drive/4x4',
								TransmissionStyle: 'Manual/Standard',
								TransmissionSpeeds: '5',
								ErrorCode: '0'
							}
						]
					}
				: {
						results: [
							{
								NHTSACampaignNumber: '93V105000',
								Component: 'STEERING',
								Summary: 'THE STEERING COLUMN MAY SEPARATE.',
								Consequence: 'LOSS OF STEERING CONTROL.',
								Remedy: 'DEALERS WILL INSPECT AND REPAIR.',
								ReportReceivedDate: '02/07/1993'
							}
						]
					};
		response.writeHead(200, { 'content-type': 'application/json' });
		response.end(JSON.stringify(body));
	});
	const port = Number(new URL(process.env.NHTSA_BASE ?? 'http://localhost:4499').port);
	await new Promise<void>((resolve) => nhtsa.listen(port, resolve));
});

test.afterAll(async () => {
	await new Promise<void>((resolve) => nhtsa.close(() => resolve()));
});

test('adds a car from its VIN and shows its recalls', async ({ page }) => {
	const { id: owner } = await demoUser();

	await page.goto('/vehicles/new');
	await page.getByLabel('VIN').fill(VIN);
	await page.getByRole('button', { name: 'Look up' }).click();

	await expect(page.getByText('Filled in 10 fields from the VIN.')).toBeVisible();
	await expect(page.getByLabel('Year')).toHaveValue('1991');
	await expect(page.getByLabel('Make')).toHaveValue('Jeep');
	await expect(page.getByLabel('Model')).toHaveValue('Wrangler');
	await expect(page.getByLabel('Trim')).toHaveValue('S');
	await expect(page.getByLabel('Engine Type')).toHaveValue('I6');
	await expect(page.getByLabel('Drivetrain')).toHaveValue('4WD');

	// Mileage reads grouped as it is typed, and an edit in the middle keeps its place.
	const mileage = page.getByLabel('Current Mileage');
	await mileage.fill('115000');
	await expect(mileage).toHaveValue('115,000');
	await mileage.press('End');
	await mileage.press('ArrowLeft');
	await mileage.press('ArrowLeft');
	await mileage.press('ArrowLeft');
	await mileage.pressSequentially('59');
	await expect(mileage).toHaveValue('11,559,000');
	await mileage.fill('115000');
	await page.getByRole('button', { name: 'Add Vehicle' }).click();
	await expect(page).toHaveURL(/\/vehicles\/[0-9a-f-]{36}$/);
	expect(
		await sql(
			`select concat_ws('|', year, make, trim, body_style, engine_size, drivetrain, fuel_type) from vehicles where vin = '${VIN}' and user_id = '${owner}'`
		)
	).toBe('1991|Jeep|S|SUV|4.0 L|4WD|Gasoline');

	const recalls = page.getByRole('region', { name: 'Recalls' });
	await expect(recalls.getByText('1 recall on file for the 1991 Jeep Wrangler.')).toBeVisible();
	await recalls.getByText('Steering', { exact: true }).click();
	await expect(recalls.getByText('Dealers will inspect and repair.')).toBeVisible();

	// No schedules yet, so the usual ones are offered, counting from today's odometer.
	const maintenance = page.getByRole('region', { name: 'Maintenance Schedule' });
	await maintenance.getByLabel('Spark plugs').uncheck();
	await expect(maintenance.getByLabel('Count from today at 115,000 mi')).toBeChecked();
	await maintenance.getByRole('button', { name: 'Add 8 schedules' }).click();
	await expect(maintenance.getByText('Suggested for this car')).toBeHidden();
	await expect(maintenance.getByText('Oil change')).toBeVisible();
	const vehicleId = await sql(`select id from vehicles where vin = '${VIN}'`);
	expect(
		await sql(
			`select count(*) || '|' || min(last_completed_mileage) || '|' || count(*) filter (where name = 'Spark plugs') from maintenance_schedules where vehicle_id = '${vehicleId}'`
		)
	).toBe('8|115000|0');
	// A baseline is not a service: nothing is logged as a repair for it.
	expect(await sql(`select count(*) from repairs where vehicle_id = '${vehicleId}'`)).toBe('0');

	// What the owner typed is theirs: a second lookup fills nothing over it.
	await page.getByRole('link', { name: 'Edit Vehicle' }).click();
	await page.getByLabel('Trim').fill('Sahara');
	await page.getByRole('button', { name: 'Look up' }).click();
	await expect(page.getByText('Nothing new to fill in')).toBeVisible();
	await expect(page.getByLabel('Trim')).toHaveValue('Sahara');

	// Model suggests the make's models for the year, from NHTSA.
	await page.getByLabel('Model', { exact: true }).fill('');
	await page.getByLabel('Model', { exact: true }).click();
	await page.getByRole('option', { name: 'Cherokee' }).click();
	await expect(page.getByLabel('Model', { exact: true })).toHaveValue('Cherokee');

	await sql(`delete from vehicles where vin = '${VIN}' and user_id = '${owner}'`);
});
