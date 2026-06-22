const out = [];
for (const item of $input.all()) {
  const u = item.json;
  const cbq = u.callback_query;
  const msg = u.message || u.edited_message || u.channel_post || (cbq && cbq.message) || {};
  const chat = (msg && msg.chat) || {};
  const chatId = chat.id != null ? String(chat.id) : '';
  out.push({ json: { chatId: chatId, update: u } });
}
return out;
