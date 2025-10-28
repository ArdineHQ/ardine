/**
 * Tagged template for GraphQL queries
 * This is a simple pass-through function for now
 * Can be extended with graphql-tag if needed
 */
export function gql(strings: TemplateStringsArray | string, ...values: any[]): string {
	if (typeof strings === "string") {
		return strings;
	}
	return strings.reduce((acc, str, i) => acc + str + (values[i] || ""), "");
}
