import OpenAI from 'openai';

const client = new OpenAI({
  baseURL: 'https://beta.sree.shop/v1',
  apiKey: "ddc-beta-t0y73fcskp-fIew5Ral9MH58vhnfVPMy33Gapc7y5oRKwp"
});

const response = await client.chat.completions.create({
  model: 'Provider-3/DeepSeek-R1',
  messages: [
    { role: 'user', content: 'tell me today date only date give in dd/mm/yyyy format' }
  ]
});

console.log(response.choices[0].message.content);