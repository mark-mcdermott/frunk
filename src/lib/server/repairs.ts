import { sql } from 'drizzle-orm';
import * as table from './db/schema';

/** How many receipts a repair carries, as a column — cards show a chip, not the files. */
export const attachmentCount = (repairId: typeof table.repairs.id) =>
	sql<number>`(select count(*) from ${table.repairAttachments} where ${table.repairAttachments.repairId} = ${repairId})`.mapWith(
		Number
	);
