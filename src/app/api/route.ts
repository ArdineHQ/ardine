import {NextRequest} from "next/server";

export async function GET(_req: NextRequest) {
    return Response.json({message: "404 Not Found"}, {status: 404});
}