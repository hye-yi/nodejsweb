var router = require('express').Router();

router.get('/shop/shirts', function(req, res){
   응답.send('셔츠 파는 페이지입니다.');
});

router.get('/shop/pants', function(req, res){
   응답.send('바지 파는 페이지입니다.');
}); 

module.exports = router;