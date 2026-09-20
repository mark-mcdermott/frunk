import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Trash2 } from 'lucide-react';
import { useEffect, useState, type SubmitEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import {
	createVendor,
	deleteVendor,
	keys,
	listVendors,
	updateVendor,
	type Vendor,
	type VendorInput
} from '../api';
import { useCrumbs } from '../AppShell';
import { TextField } from '../components/Field';

/**
 * Add and edit a vendor, built to `docs/mocks/vendor-edit.webp`.
 *
 * This form is what made the repair form's "Add a vendor" link honest — it pointed at a
 * vendors screen that had no way to add one.
 *
 * There is a `GET /api/vendors/:id`, but the list is small, cached and always visited on
 * the way here, so the row is read out of the cache and the list query is the fallback.
 */

interface FormState {
	name: string;
	address: string;
	phone: string;
	website: string;
}

const BLANK: FormState = { name: '', address: '', phone: '', website: '' };

/** An emptied optional field sends `null`, which is what clears the column. */
const orNull = (value: string) => (value.trim() ? value.trim() : null);

export function VendorFormPage() {
	const { id } = useParams();
	const editing = Boolean(id);
	const navigate = useNavigate();
	const client = useQueryClient();

	const [form, setForm] = useState<FormState>(BLANK);
	const [errors, setErrors] = useState<Partial<Record<'name' | 'website', string>>>({});
	const [confirmingDelete, setConfirmingDelete] = useState(false);

	const vendors = useQuery({ queryKey: keys.vendors, queryFn: listVendors });
	const existing = vendors.data?.find((vendor) => vendor.id === id);

	useEffect(() => {
		if (existing) {
			setForm({
				name: existing.name,
				address: existing.address ?? '',
				phone: existing.phone ?? '',
				website: existing.website ?? ''
			});
		}
	}, [existing]);

	useCrumbs(editing ? [{ label: existing?.name ?? 'Vendor' }, { label: 'Edit' }] : [{ label: 'New vendor' }]);

	const save = useMutation({
		mutationFn: (payload: VendorInput) =>
			editing ? updateVendor(id as string, payload) : createVendor(payload),
		onSuccess: (vendor: Vendor) => {
			client.invalidateQueries({ queryKey: keys.vendors });
			client.invalidateQueries({ queryKey: keys.repairs });
			navigate('/vendors');
			return vendor;
		}
	});

	const remove = useMutation({
		mutationFn: () => deleteVendor(id as string),
		onSuccess: () => {
			client.invalidateQueries({ queryKey: keys.vendors });
			client.invalidateQueries({ queryKey: keys.repairs });
			navigate('/vendors');
		}
	});

	function submit(event: SubmitEvent<HTMLFormElement>) {
		event.preventDefault();

		const found: Partial<Record<'name' | 'website', string>> = {};
		if (!form.name.trim()) found.name = 'Name is required';

		/*
		 * The column is free text, so a bare "example.com" is accepted and stored — but it
		 * would render as a relative link. Requiring the scheme here keeps the Website link
		 * on the index from silently pointing inside the app.
		 */
		if (form.website.trim() && !/^https?:\/\//i.test(form.website.trim()))
			found.website = 'Start the address with http:// or https://';

		setErrors(found);
		if (Object.keys(found).length > 0) return;

		save.mutate({
			name: form.name.trim(),
			address: orNull(form.address),
			phone: orNull(form.phone),
			website: orNull(form.website)
		});
	}

	if (editing && vendors.isPending) {
		return <p className="py-10 text-[0.9375rem] text-text-muted">Loading…</p>;
	}

	if (editing && !existing) {
		return (
			<p role="alert" className="py-10 text-[0.9375rem] text-destructive">
				{vendors.isError && vendors.error instanceof Error
					? vendors.error.message
					: 'Vendor not found'}
			</p>
		);
	}

	const busy = save.isPending || remove.isPending;

	return (
		<>
			<Link
				to="/vendors"
				className="inline-flex items-center gap-2 text-[0.9375rem] text-accent-bright transition-opacity hover:opacity-80"
			>
				<ArrowLeft className="size-4" strokeWidth={1.75} aria-hidden />
				Back to vendors
			</Link>

			<h1 className="display mt-6 text-[clamp(2rem,4vw,2.75rem)]">
				{editing ? 'Edit Vendor' : 'Add Vendor'}
			</h1>
			<p className="mt-3 text-[0.9375rem] text-text-muted">
				{editing ? "Update this shop's details." : 'A shop or specialist who works on your cars.'}
			</p>

			<form onSubmit={submit} noValidate className="card mt-10 max-w-xl p-6 sm:p-8">
				<div className="flex flex-col gap-5">
					<TextField
						id="name"
						label="Name"
						placeholder="Steamtown Auto Care"
						error={errors.name}
						value={form.name}
						onChange={(value) => setForm((prev) => ({ ...prev, name: value }))}
					/>
					<TextField
						id="phone"
						label="Phone"
						optional
						placeholder="(570) 555-0104"
						value={form.phone}
						onChange={(value) => setForm((prev) => ({ ...prev, phone: value }))}
					/>
					<TextField
						id="address"
						label="Address"
						optional
						placeholder="150 Lackawanna Ave, Scranton, PA 18503"
						value={form.address}
						onChange={(value) => setForm((prev) => ({ ...prev, address: value }))}
					/>
					<TextField
						id="website"
						label="Website"
						optional
						placeholder="https://example.com"
						error={errors.website}
						value={form.website}
						onChange={(value) => setForm((prev) => ({ ...prev, website: value }))}
					/>
				</div>

				{(save.isError || remove.isError) && (
					<p role="alert" className="mt-6 text-[0.875rem] text-destructive">
						{(save.error ?? remove.error) instanceof Error
							? (save.error ?? remove.error)!.message
							: 'Could not save this vendor.'}
					</p>
				)}

				<div className="mt-8 flex flex-wrap gap-3">
					<button type="submit" disabled={busy} className="btn-primary disabled:opacity-60">
						{save.isPending ? 'Saving…' : editing ? 'Save Changes' : 'Add Vendor'}
					</button>

					{editing &&
						(confirmingDelete ? (
							<div className="flex items-center gap-3">
								<button
									type="button"
									disabled={busy}
									onClick={() => remove.mutate()}
									className="rounded-full bg-destructive px-5 py-3 text-[0.9375rem] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60"
								>
									{remove.isPending ? 'Deleting…' : 'Delete permanently'}
								</button>
								<button
									type="button"
									onClick={() => setConfirmingDelete(false)}
									className="text-[0.9375rem] text-text-muted transition-colors hover:text-text"
								>
									Cancel
								</button>
							</div>
						) : (
							<button
								type="button"
								onClick={() => setConfirmingDelete(true)}
								className="flex items-center gap-2 rounded-full border border-destructive/40 px-5 py-3 text-[0.9375rem] text-destructive transition-colors hover:bg-destructive-bg"
							>
								<Trash2 className="size-4" strokeWidth={1.75} aria-hidden />
								Delete Vendor
							</button>
						))}
				</div>

				{confirmingDelete && (
					<p className="mt-4 text-[0.8125rem] text-text-muted">
						Repairs done here are kept — they simply stop naming a vendor.
					</p>
				)}
			</form>
		</>
	);
}
