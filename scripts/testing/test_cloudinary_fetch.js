const fetch = require('node-fetch');
async function test() {
  const FormData = require('form-data');
  const form = new FormData();
  form.append('file', 'https://drive.google.com/uc?id=14LsaWlnAUiJjOMpGxkz31BhgUwfXTd4h&export=download');
  form.append('upload_preset', 'padmanabh_store');

  const res = await fetch('https://api.cloudinary.com/v1_1/ybzj1wn7/image/upload', {
    method: 'POST',
    body: form
  });
  
  const data = await res.json();
  console.log(res.status, data);
}
test();
