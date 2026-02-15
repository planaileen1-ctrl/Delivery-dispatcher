"use client";

import EmployeeDeliveryPdfsPage from "@/app/employee/delivery-pdfs/page";
import PharmacyAdminFrame from "@/components/PharmacyAdminFrame";

export default function PharmacyDeliveryPdfsPage() {
	return (
		<PharmacyAdminFrame title="Delivery PDFs" subtitle="Legal backups">
			<EmployeeDeliveryPdfsPage />
		</PharmacyAdminFrame>
	);
}
