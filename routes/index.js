var express = require('express');
var router = express.Router();
const userModel = require('./users');
const passport = require('passport');
const localStrategy = require("passport-local");
const Project = require("./projectdetail");
const { route } = require('../app');

passport.use(new localStrategy(userModel.authenticate()));

router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

router.get('/register', function(req, res) {
  res.render('register', {nav:false});
});

router.post('/register', function(req, res) {
  const data = new userModel({
    email: req.body.email
  })
  userModel.register(data, req.body.password)

  .then(function () {
    passport.authenticate("local")(req, res, function () {
      res.redirect("/profile");
    });
  });
});

router.post('/login', (req, res, next) => {
  passport.authenticate('local', (err, user, info) => {
      if (err) {
          return next(err);
      }
      if (!user) {
          
          return res.render('index', { error: 'Invalid Credentials' });
      }
      req.logIn(user, (err) => {
          if (err) {
              return next(err);
          }
          return res.redirect('/profile');
      });
  })(req, res, next);
});

router.get('/profile', async function(req, res) {
  try {
    const totalProjects = await Project.countDocuments();
    const closedProjects = await Project.countDocuments({ status: 'Closed' });
    const runningProjects = await Project.countDocuments({ status: 'Running' });
    const cancelledProjects = await Project.countDocuments({ status: 'Cancelled' });
    const closureDelayProjects = await Project.countDocuments({
      status: 'Running',
      endDate: { $lt: new Date() } 
  });

    res.render('profile', {
        projectCounts: {
            total: totalProjects,
            closed: closedProjects,
            running: runningProjects,
            cancelled: cancelledProjects,
            closureDelay: closureDelayProjects
        }
    });
} catch (error) {
    console.error('Error fetching project counts:', error);
    res.status(500).send('Error fetching project counts');
}
});

router.get('/addproject', function(req, res) {
  res.render('addproject');
});

router.post('/addproject', function(req, res){
  const projectData = new Project({
      theme:req.body.theme,
      reason: req.body.reason,
      type: req.body.type,
      decision: req.body.decision,
      category: req.body.category,
      priority: req.body.priority,
      department: req.body.department,
      startDate: req.body.startDate,
      endDate: req.body.endDate,
      location: req.body.location,
      status: req.body.status
  });
  projectData.save();
  res.redirect("/projectlist");

  // projectData.save((err) => {
  //     if (err) {
  //         res.status(500).send('Error saving project.');
  //     } else {
          
  //     }
  // });
});

router.get('/projectlist', async (req, res) => {
  const searchQuery = req.query.search || '';
  const sortQuery = req.query.sort || '';
  const page = parseInt(req.query.page) || 1; 
  const limit = 7; 

  const filter = {
    $or: [
      { name: new RegExp(searchQuery, 'i') },
      { theme: new RegExp(searchQuery, 'i') }
    ]
  };

  let sort = {};
  if (sortQuery) {
    // Ensure valid fields for sorting
    const validSortFields = ['priority', 'category', 'reason', 'division', 'department', 'location'];
    if (validSortFields.includes(sortQuery)) {
      sort[sortQuery] = 1; // 1 for ascending
    }
  }

  try {
    const totalProjects = await Project.countDocuments(filter);
    const totalPages = Math.ceil(totalProjects / limit);

    const projects = await Project.find(filter)
      .sort(sort) 
      .skip((page - 1) * limit)
      .limit(limit);

    const formattedProjects = projects.map(project => ({
      ...project._doc,
      startDate: new Date(project.startDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
      endDate: new Date(project.endDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
    }));

    res.render('projectlist', {
      projects: formattedProjects,
      searchQuery,
      sortQuery,
      currentPage: page,
      totalPages
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});

router.post('/update-status', async (req, res) => {
  const { _id, status } = req.body;
  console.log('Received data:', req.body);

  try {
      const result = await Project.findByIdAndUpdate(_id, { status });
      if (!result) {
          return res.status(404).json({ success: false, message: 'Project not found' });
      }
      res.json({ success: true });
  } catch (error) {
      console.error('Error updating status:', error);
      res.status(500).json({ success: false, message: 'Error updating status' });
  }
});

 





router.get('/get-project-counts', async (req, res) => {
  try {
    const pipeline = [
      {
          $group: {
              _id: '$department',
              totalProjects: { $sum: 1 },
              closedProjects: { $sum: { $cond: [{ $eq: ['$status', 'Closed'] }, 1, 0] } }
          }
      }
  ];
  


      const results = await Project.aggregate(pipeline);
      res.json(results);
  } catch (error) {
      console.error('Error fetching project data:', error);
      res.status(500).json({ error: 'Failed to fetch project data' });
  }
});



router.get('/logout', function(req, res, next) {
  req.logout(function(err) {
    if (err) { return next(err); }
    res.redirect('/');
  });
});

module.exports = router;



