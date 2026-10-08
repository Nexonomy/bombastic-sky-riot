import { handleCloud } from "../server/cloud";
export async function GET(request: Request) {
  return handleCloud(request, "health");
}
