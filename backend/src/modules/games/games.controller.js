
import pool from '../../../db.js';

const GamesController = {
    // GET /games/settings
    getSettings: async (req, res) => {
        try {
            const [rows] = await pool.execute("SELECT * FROM game_settings");
            // Transform array to object { game_key: { isActive, maintenanceMessage } }
            const settings = {};

            // Default Fallback
            const defaultGames = ['taixiu', 'baucua', 'wheel', 'slots'];
            defaultGames.forEach(key => settings[key] = { isActive: true, maintenanceMessage: '' });

            rows.forEach(r => {
                settings[r.game_key] = {
                    isActive: r.is_active,
                    maintenanceMessage: r.maintenance_message || ''
                };
            });
            res.json(settings);
        } catch (error) {
            console.error("Get Settings Error:", error);
            res.status(500).json({ message: 'Error fetching game settings' });
        }
    },

    // POST /games/settings/:gameKey
    updateSetting: async (req, res) => {
        try {
            const { gameKey } = req.params;
            const { isActive, maintenanceMessage } = req.body;

            // Determine active bool
            const newActive = isActive === true || isActive === 'true';

            await pool.execute(
                `INSERT INTO game_settings (game_key, is_active, maintenance_message, updated_at) 
                 VALUES (?, ?, ?, NOW())
                 ON CONFLICT (game_key) 
                 DO UPDATE SET is_active = EXCLUDED.is_active, maintenance_message = EXCLUDED.maintenance_message, updated_at = NOW()`,
                [gameKey, newActive, maintenanceMessage || '']
            );

            res.json({ success: true, message: `Updated ${gameKey} to ${newActive ? 'Active' : 'Inactive'}` });
        } catch (error) {
            console.error("Update Setting Error:", error);
            res.status(500).json({ message: 'Error updating setting' });
        }
    }
};

export default GamesController;
