"use client";

import EmployeePumpsPage from "@/app/employee/pumps/page";
import PharmacyAdminFrame from "@/components/PharmacyAdminFrame";

export default function PharmacyPumpsPage() {
	return (
		<PharmacyAdminFrame title="Medical Pumps" subtitle="Full admin access">
			<EmployeePumpsPage />
		</PharmacyAdminFrame>
	);
}
