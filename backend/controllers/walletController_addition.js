
/**
 * Get available payment methods
 */
export async function getPaymentMethods(req, res) {
    try {
        const [methods] = await pool.execute(
            `SELECT id, name, display_name, description, min_amount, max_amount, 
                    currency, is_active, icon_url, config
             FROM payment_methods
             WHERE is_active = TRUE
             ORDER BY display_order ASC, name ASC`
        );

        res.json(methods);
    } catch (error) {
        console.error('❌ Error getting payment methods:', error);
        res.status(500).json({ message: 'Error getting payment methods' });
    }
}
