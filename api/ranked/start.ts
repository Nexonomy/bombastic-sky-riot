import { handleCloud } from "../../server/cloud";
export async function POST(request: Request) {
  return handleCloud(request, "start");
}
