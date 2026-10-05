const fs = require("fs");

const configuredApiBase = String(process.env.API_BASE_URL || "").trim();
const apiBase = configuredApiBase
	? configuredApiBase.replace(/\/$/, "")
	: "https://backend-o5q5.onrender.com/api";
const configPath = "config.js";
const template = fs.readFileSync(configPath, "utf8");
if (!/^window\.APP_CONFIG\.API_BASE = .*;$/m.test(template)) {
	throw new Error("Could not find APP_CONFIG.API_BASE in config.js");
}
const contents = template.replace(
	/^window\.APP_CONFIG\.API_BASE = .*;$/m,
	`window.APP_CONFIG.API_BASE = ${JSON.stringify(apiBase)};`
);

fs.writeFileSync(configPath, contents);
