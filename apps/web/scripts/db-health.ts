import { neon } from "@neondatabase/serverless"
import { config } from "dotenv"

config({ path: ".env.local" })

const sql = neon(process.env.DATABASE_URL!)
const result = await sql`SELECT 1 AS ok`
console.log(result[0].ok === 1 ? "DB OK" : "DB FAIL")
