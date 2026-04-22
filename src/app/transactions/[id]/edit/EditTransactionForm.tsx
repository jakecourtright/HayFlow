'use client';

import { updateTransaction, deleteTransaction } from "@/app/actions";
import { useState } from "react";
import { Trash2, AlertCircle } from "lucide-react";
import CustomSelect from "@/components/CustomSelect";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import SubmitButton from "@/components/ui/SubmitButton";
import { useToast } from "@/components/ui/Toast";

interface EditTransactionFormProps {
    transaction: {
        id: number;
        type: string;
        stack_id: number;
        location_id: number | null;
        amount: string;
        entity: string | null;
        price: string | null;
    };
    stacks: { id: number; name: string; commodity: string }[];
    locations: { id: number; name: string }[];
}

export default function EditTransactionForm({ transaction, stacks, locations }: EditTransactionFormProps) {
    const toast = useToast();
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [selectedType, setSelectedType] = useState(transaction.type);
    const [selectedStackId, setSelectedStackId] = useState(transaction.stack_id.toString());
    const [selectedLocationId, setSelectedLocationId] = useState(
        transaction.location_id ? transaction.location_id.toString() : 'none'
    );
    const [error, setError] = useState<string | null>(null);

    const updateWithId = updateTransaction.bind(null, transaction.id.toString());
    const deleteWithId = deleteTransaction.bind(null, transaction.id.toString());

    const getPriceLabel = (type: string) => {
        switch (type) {
            case 'production': return 'Production cost ($/unit)';
            case 'purchase': return 'Purchase price ($/unit)';
            case 'sale': return 'Sale price ($/unit)';
            case 'adjustment': return 'Value adjustment ($/unit)';
            default: return 'Price / cost ($/unit)';
        }
    };

    async function handleSubmit(formData: FormData) {
        try {
            setError(null);
            await updateWithId(formData);
        } catch (e: any) {
            if (e?.digest?.startsWith('NEXT_REDIRECT')) throw e;
            const msg = e.message || 'Error updating transaction.';
            setError(msg);
            toast.show(msg, 'error');
        }
    }

    async function handleDelete() {
        setDeleting(true);
        try {
            await deleteWithId();
            toast.show('Transaction deleted', 'success');
        } catch (e: any) {
            if (e?.digest?.startsWith('NEXT_REDIRECT')) throw e;
            const msg = e.message || 'Error deleting transaction.';
            setError(msg);
            toast.show(msg, 'error');
            setDeleting(false);
            setConfirmDelete(false);
        }
    }

    const typeOptions = [
        { value: 'production', label: 'Production (In)' },
        { value: 'sale', label: 'Sale (Out)' },
        { value: 'purchase', label: 'Purchase (In)' },
        { value: 'adjustment', label: 'Adjustment' },
    ];

    const stackOptions = [
        { value: '', label: 'Select stack…' },
        ...stacks.map(s => ({ value: String(s.id), label: `${s.name} (${s.commodity})` })),
    ];

    const locationOptions = [
        { value: 'none', label: 'None (in transit / sold)' },
        ...locations.map(l => ({ value: String(l.id), label: l.name })),
    ];

    const unitOptions = [
        { value: 'bales', label: 'Bales' },
        { value: 'tons', label: 'Tons' },
    ];

    const priceUnitOptions = [
        { value: 'ton', label: '$ / Ton' },
        { value: 'bale', label: '$ / Bale' },
    ];

    return (
        <>
            <form action={handleSubmit} className="surface-card space-y-5">
                {error && (
                    <div role="alert" className="flex items-start gap-2 p-3 rounded-lg" style={{ background: 'color-mix(in srgb, var(--error) 14%, transparent)', color: 'var(--error)' }}>
                        <AlertCircle size={16} className="shrink-0 mt-0.5" />
                        <p className="text-sm">{error}</p>
                    </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="label-modern">Type</label>
                        <CustomSelect
                            name="type"
                            options={typeOptions}
                            value={selectedType}
                            onChange={setSelectedType}
                        />
                    </div>

                    <div>
                        <label className="label-modern">Stack</label>
                        <CustomSelect
                            name="stackId"
                            required
                            options={stackOptions}
                            value={selectedStackId}
                            onChange={setSelectedStackId}
                        />
                    </div>
                </div>

                <div>
                    <label className="label-modern">
                        {selectedType === 'sale' ? 'Source location' : 'Destination location'}
                    </label>
                    <CustomSelect
                        name="locationId"
                        options={locationOptions}
                        value={selectedLocationId}
                        onChange={setSelectedLocationId}
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="label-modern" htmlFor="tx-amount">Amount</label>
                        <input
                            id="tx-amount"
                            type="number"
                            name="amount"
                            required
                            step="0.01"
                            min="0"
                            inputMode="decimal"
                            className="input-modern"
                            defaultValue={parseFloat(transaction.amount)}
                        />
                    </div>
                    <div>
                        <label className="label-modern">Unit</label>
                        <CustomSelect
                            name="unit"
                            options={unitOptions}
                            defaultValue="bales"
                        />
                    </div>
                </div>

                <div>
                    <label className="label-modern" htmlFor="tx-entity">Entity / notes</label>
                    <input
                        id="tx-entity"
                        type="text"
                        name="entity"
                        className="input-modern"
                        placeholder="Buyer name / field # / notes"
                        defaultValue={transaction.entity || ''}
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="label-modern" htmlFor="tx-price">{getPriceLabel(selectedType)}</label>
                        <input
                            id="tx-price"
                            type="number"
                            name="price"
                            step="0.01"
                            min="0"
                            inputMode="decimal"
                            className="input-modern"
                            placeholder="0.00"
                            defaultValue={transaction.price ? parseFloat(transaction.price) : ''}
                        />
                    </div>
                    <div>
                        <label className="label-modern">Price per</label>
                        <CustomSelect
                            name="priceUnit"
                            options={priceUnitOptions}
                            defaultValue="ton"
                        />
                    </div>
                </div>

                <SubmitButton className="w-full" pendingLabel="Saving…">
                    Save changes
                </SubmitButton>
            </form>

            <div className="mt-6 pt-6" style={{ borderTop: '1px solid var(--glass-border)' }}>
                <button
                    type="button"
                    onClick={() => setConfirmDelete(true)}
                    className="btn btn-danger w-full"
                >
                    <Trash2 size={16} />
                    Delete transaction
                </button>
            </div>

            <ConfirmDialog
                open={confirmDelete}
                onClose={() => setConfirmDelete(false)}
                onConfirm={handleDelete}
                title="Delete transaction?"
                body="This will remove the record permanently and adjust stack quantity accordingly. This cannot be undone."
                confirmLabel="Delete transaction"
                tone="danger"
                busy={deleting}
            />
        </>
    );
}
