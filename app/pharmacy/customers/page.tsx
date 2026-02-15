"use client";

import EmployeeCustomersPage from "@/app/employee/customers/page";
import PharmacyAdminFrame from "@/components/PharmacyAdminFrame";

export default function PharmacyCustomersPage() {
	return (
		<PharmacyAdminFrame title="Customers" subtitle="Edit and control records">
			<EmployeeCustomersPage />
		</PharmacyAdminFrame>
	);
}
