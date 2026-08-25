"use client";

import { InvoiceItem } from "@/lib/api/invoice";
import { downloadInvoice } from "@/lib/api/download-invoice";
import { generateAndDownloadInvoice } from "@/lib/utils/invoice-generator";
import { useAuthStore } from "@/store/useAuthStore";
import { useTranslations } from "next-intl";
import { Download } from "lucide-react";
import { useMemo, useState } from "react";
import { InvoicePagination } from "@/components/common/InvoicePagination";
import { JOJOCustomButton, JOJOButtonSize, JOJOButtonMode } from "@/components/ui/JOJOButton";
import { logger } from "@/lib/logger/logger";

const PAGE_SIZE = 5;

interface InvoicePartProps {
    invoices: InvoiceItem[];
    isError: boolean;
}

export default function InvoicePart({ invoices, isError }: InvoicePartProps) {
    const sessionId = useAuthStore(state => state.token);
    const tSettings = useTranslations("tSettings");
    const [currentPage, setCurrentPage] = useState(1);
    const [downloadingNumber, setDownloadingNumber] = useState<string | null>(null);

    const pageCount = Math.max(1, Math.ceil(invoices.length / PAGE_SIZE));

    const visibleInvoices = useMemo(
        () => invoices.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
        [currentPage, invoices]
    );

    const handleDownloadClick = async (invoiceNumber: string) => {
        if (downloadingNumber) return;
        setDownloadingNumber(invoiceNumber);
        try {
            const response = await downloadInvoice(invoiceNumber, sessionId ?? undefined);
            const invoiceData = response?.data?.invoice;
            if (invoiceData) {
                await generateAndDownloadInvoice(invoiceData);
            } else {
                logger.error("Failed to download invoice details: Empty invoice data");
            }
        } catch (err) {
            logger.error("Error downloading invoice:", err);
        } finally {
            setDownloadingNumber(null);
        }
    };

    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between items-start">
                <div>
                    <h1 className="text-3xl font-semibold text-theme_1">{tSettings("invoice_title")}</h1>
                    <p className="mt-2 text-sm text-theme_5">{tSettings("invoice_desc")}</p>
                </div>
                <div className="rounded-lg border border-theme_1/10 bg-theme_11/70 px-5 py-4 text-right">
                    <div className="text-4xl font-semibold text-theme_13_samecolour">{invoices.length}</div>
                    <div className="text-xs text-theme_5 font-medium">
                        {tSettings("total_invoices")}
                    </div>
                </div>
            </div>

            {isError && (
                <div className="rounded-3xl border border-red-500/20 bg-red-500/10 p-6 text-red-500">
                    {tSettings("invoice_load_error")}
                </div>
            )}

            {!isError && invoices.length === 0 && (
                <div className="rounded-3xl border border-theme_1/10 bg-theme_12/70 p-6 text-theme_5">
                    {tSettings("no_invoices_found")}
                </div>
            )}

            {!isError && invoices.length > 0 && (
                <div className="overflow-hidden rounded-3xl border border-theme_1/10 bg-theme_12/70">
                    <table className="min-w-full divide-y divide-theme_1/10 text-left">
                        <thead className="bg-theme_11/70 text-theme_5">
                            <tr>
                                <th className="px-6 py-4 text-md font-semibold uppercase">{tSettings("invoice_number")}</th>
                                <th className="px-6 py-4 text-md font-semibold uppercase">{tSettings("plan_name")}</th>
                                <th className="px-6 py-4 text-md font-semibold uppercase">{tSettings("date")}</th>
                                <th className="px-6 py-4 text-md font-semibold uppercase text-right">{tSettings("action")}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-theme_1/10">
                            {visibleInvoices.map((invoice) => (
                                <tr key={invoice.sInvoiceNumber} className="bg-theme_12/70 transition hover:bg-theme_11/70">
                                    <td className="px-6 py-4 align-top">
                                        <div className="text-sm font-semibold text-theme_1 break-all">{invoice.sInvoiceNumber}</div>
                                    </td>
                                    <td className="px-6 py-4 align-top">
                                        <div className="text-sm font-semibold text-theme_1">{invoice.sPlanName}</div>
                                    </td>
                                    <td className="px-6 py-4 align-top">
                                        <div className="text-sm font-semibold text-theme_1">
                                            {new Date(invoice.dCreatedAt).toLocaleDateString("en-GB", {
                                                day: "2-digit",
                                                month: "short",
                                                year: "numeric",
                                            })}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 align-top text-right">
                                        <JOJOCustomButton
                                            type="button"
                                            size={JOJOButtonSize.S}
                                            mode={JOJOButtonMode.ICON_TEXT}
                                            isLoading={downloadingNumber === invoice.sInvoiceNumber}
                                            disabled={!!downloadingNumber}
                                            onClick={() => handleDownloadClick(invoice.sInvoiceNumber)}
                                            leftIcon={<Download className="h-4 w-4" />}
                                            className="justify-end"
                                            bgColor="theme_13_samecolour"
                                            hoverColor="theme_8"
                                            textColor="theme_1"
                                        >
                                            {tSettings("download")}
                                        </JOJOCustomButton>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    <InvoicePagination
                        currentPage={currentPage}
                        totalPages={pageCount}
                        totalRecords={invoices.length}
                        onPageChange={setCurrentPage}
                    />
                </div>
            )}
        </div>
    );
}
