/**
 * Global SMS Sender & Logger
 * @param {string} phone - Standardized phone number (233...)
 * @param {string} message - The message content
 * @param {string} type - 'served', 'promotional', or 'custom'
 */
async function triggerSMS(phone, message, type) {
    const { data: { session } } = await _supabase.auth.getSession();

    // Simply insert the record. The DB Webhook handles the rest.
    const { data, error } = await _supabase
        .from('sms_logs')
        .insert([{
            phone: standardizePhone(phone),
            message: message,
            type: type,
            sender_id: session.user.id,
            status: 'pending'
        }])
        .select()
        .single();

    if (error) return { success: false, error: error.message };

    // We return success true because the "order" was placed in the queue
    return { success: true, data };
}