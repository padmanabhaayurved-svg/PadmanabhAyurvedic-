const test = async () => {
  const fetch = require('node-fetch');
  
  // 1. Auth
  const authRes = await fetch('https://padmanabh-ayurvedic-smoky.vercel.app/api/shiprocket', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      endpoint: '/auth/login',
      method: 'POST',
      body: { email: 'padmanabhaayurved@gmail.com', password: 'I5#6ASqv5flJN7j0TMgbRGRoI$fqvZO4' }
    })
  });
  const authData = await authRes.json();
  console.log("Auth:", authData);
  
  if (!authData.token) return;

  // 2. Serviceability
  const servRes = await fetch('https://padmanabh-ayurvedic-smoky.vercel.app/api/shiprocket', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      endpoint: '/courier/serviceability/?pickup_postcode=414001&delivery_postcode=414001&weight=0.5&cod=1',
      method: 'GET',
      token: authData.token
    })
  });
  const servData = await servRes.json();
  console.log("Serviceability:", JSON.stringify(servData, null, 2));
};

test();
