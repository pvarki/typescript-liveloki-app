import axios from 'axios';

const token = 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6IjEifQ.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiYWRtaW4iOnRydWUsImlzcyI6Imh0dHA6Ly9qd2tzOjQwMDAvcmVhbG1zL3lvdXItcmVhbG0iLCJhdWQiOiJ5b3VyLWNsaWVudC1pZCIsImlhdCI6MTcyMDA3NTgwNCwiZXhwIjoxNzIwMDc5NDA0fQ.aMPwdclU2bzUtYvvQJPEQ3hEEdDnEljN6RQpLQxeis5bsD-USwROV2LdEAhvImMap8f0TzlLFqULTVjUbZ-Xch5aoB6yoG6Sfg5_hj0Ll-lrDZLf8VnLomNMT-jUExO-eSHgrMZx14dhJho78j7Orbh1Oovrp5X5jCG4qRdH1G5DriPLB1EO8pkuBsvdmGFQNTEdcf46SNt6IK41ZYor1iok2xDRl6UCkCkOgpOB2W29F792pi-z_2GScV_dQfoypBL0Y4b4m2ckX_JZNKBccdo75NjNem1kY032y2r0IbE6_ykTOFcYUJtHr6Pc8sVU34bAE1sg-rIvZlno_3Fasg';

axios.get('http://localhost:3000/api/test', {
    headers: {
        Authorization: `Bearer ${token}`
    }
})
.then(response => {
    console.log(response.data);
})
.catch(error => {
    console.error('Error:', error.response ? error.response.data : error.message);
});
