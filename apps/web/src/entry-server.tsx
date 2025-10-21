import { renderToString } from "react-dom/server";
import { RouterProvider } from "@tanstack/react-router";
import type { AnyRouter } from "@tanstack/react-router";

export async function render(router: AnyRouter) {
	const html = renderToString(<RouterProvider router={router} />);
	return html;
}
