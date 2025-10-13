const axios = require("axios").default;
const { wrapper } = require("axios-cookiejar-support");
const { CookieJar } = require("tough-cookie");

(async () => {
  const jar = new CookieJar();
  const client = wrapper(axios.create({ jar }));

  try {
    const url = "https://upwork99999.fwh.is/EP04A-H.json";
    const res = await client.get(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });

    console.log("✅ Response OK");
    console.log(res.data);
  } catch (err) {
    console.error("❌ Error:", err.message);
  }
})();
