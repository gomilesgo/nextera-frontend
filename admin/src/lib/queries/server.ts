import "server-only";
import { cache } from "react";
import { makeServerQueryClient } from "./client";

export const getServerQueryClient = cache(() => makeServerQueryClient());
