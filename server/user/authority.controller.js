const User = require("./user.model");

exports.getAuthorizedModules = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(200).json({ status: false, message: "User not found" });

    const modules = [];

    if (["super_admin", "OWNER", "OFFICIAL_OWNER"].includes(user.role)) {
        modules.push({ id: "sa_info", title: "Super Admin Info", icon: "badges", type: "info" });
        modules.push({ id: "bd_list", title: "BD List", icon: "ic_agency", type: "list", category: "bd" });
        modules.push({ id: "agency_list", title: "Agency List", icon: "ic_agency", type: "list", category: "agency" });
        modules.push({ id: "bd_leader_list", title: "BD Leader List", icon: "ic_agency", type: "list", category: "bd_leader" });
        modules.push({ id: "invite_bd_leader", title: "Invite BD Leader", icon: "badges", type: "invite", category: "bd_leader" });
        modules.push({ id: "invite_bd", title: "Invite BD", icon: "badges", type: "invite", category: "bd" });
        modules.push({ id: "invite_agency", title: "Invite Agency", icon: "badges", type: "invite", category: "agency" });
        modules.push({ id: "ban_user", title: "Ban User", icon: "ic_block", type: "ban" });
        modules.push({ id: "dynamic_review", title: "Dynamic Review", icon: "badges", type: "dynamic" });
    }

    return res.status(200).json({ status: true, modules });
  } catch (error) {
    return res.status(500).json({ status: false, error: error.message });
  }
};
