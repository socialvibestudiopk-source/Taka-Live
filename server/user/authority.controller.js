const User = require("./user.model");

const AuthorityController = {
    getAuthorizedModules: async (req, res) => {
        try {
            const user = await User.findById(req.params.userId);
            if (!user) return res.status(200).json({ status: false, message: "User not found" });

            const modules = [
                { id: "sa_info", title: "Admin Center", icon: "badges", type: "info" },
                { id: "bd_list", title: "BD Center", icon: "ic_agency", type: "list", category: "bd" }
            ];
            return res.status(200).json({ status: true, modules });
        } catch (error) { return res.status(500).json({ status: false, error: error.message }); }
    }
};

module.exports = AuthorityController;
