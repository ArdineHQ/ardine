import "@fastify/cookie";

declare module "fastify" {
	interface FastifyRequest {
		cookies: {
			[cookieName: string]: string | undefined;
		};
	}

	interface FastifyReply {
		setCookie(
			name: string,
			value: string,
			options?: import("@fastify/cookie").CookieSerializeOptions,
		): this;
		clearCookie(
			name: string,
			options?: import("@fastify/cookie").CookieSerializeOptions,
		): this;
	}
}
