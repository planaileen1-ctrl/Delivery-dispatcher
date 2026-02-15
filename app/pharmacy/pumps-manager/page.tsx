"use client";

import PumpsManagerPage from "@/app/employee/pumps-manager/page";
import PharmacyAdminFrame from "@/components/PharmacyAdminFrame";

export default function PharmacyPumpsManagerPage() {
	return (
		<PharmacyAdminFrame title="Pump Out" subtitle="Outstanding client pumps">
			<PumpsManagerPage />
		</PharmacyAdminFrame>
	);
}
