export interface MaintenanceTemplate {
	name: string;
	intervalMiles: number | null;
	intervalMonths: number | null;
}

export const maintenanceTemplates: MaintenanceTemplate[] = [
	{ name: 'Oil Change', intervalMiles: 5000, intervalMonths: 6 },
	{ name: 'Tire Rotation', intervalMiles: 7500, intervalMonths: 6 },
	{ name: 'Brake Inspection', intervalMiles: 15000, intervalMonths: 12 },
	{ name: 'Air Filter', intervalMiles: 15000, intervalMonths: 12 },
	{ name: 'Cabin Air Filter', intervalMiles: 15000, intervalMonths: 12 },
	{ name: 'Transmission Fluid', intervalMiles: 30000, intervalMonths: 24 },
	{ name: 'Coolant Flush', intervalMiles: 30000, intervalMonths: 24 },
	{ name: 'Spark Plugs', intervalMiles: 30000, intervalMonths: 36 },
	{ name: 'Serpentine Belt', intervalMiles: 60000, intervalMonths: 48 },
	{ name: 'Timing Belt', intervalMiles: 60000, intervalMonths: 60 },
	{ name: 'Battery Check', intervalMiles: null, intervalMonths: 12 },
	{ name: 'Wiper Blades', intervalMiles: null, intervalMonths: 12 }
];
