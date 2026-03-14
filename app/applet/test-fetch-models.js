async function test() {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.error("No API_KEY");
    return;
  }
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
  const data = await res.json();
  console.log(data.models.map(m => m.name));
}
test();
