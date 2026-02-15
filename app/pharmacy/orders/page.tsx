"use client";

import EmployeeOrdersPage from "@/app/employee/orders/page";
import PharmacyAdminFrame from "@/components/PharmacyAdminFrame";

export default function PharmacyOrdersPage() {
	return (
		<PharmacyAdminFrame title="Orders" subtitle="Realtime operations">
			<EmployeeOrdersPage />
		</PharmacyAdminFrame>
	);
}
