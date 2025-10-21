import { StrictMode } from "react";
import { hydrateRoot } from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";
import { getRouter } from "./router";

const router = getRouter();

hydrateRoot(
	document,
	<StrictMode>
		<RouterProvider router={router} />
	</StrictMode>,
);
