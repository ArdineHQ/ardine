import { StrictMode } from "react";
import { hydrateRoot } from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";
import { router } from "./router";

hydrateRoot(
	document,
	<StrictMode>
		<RouterProvider router={router} />
	</StrictMode>,
);
